import React, {useState} from "react";
import {useDrag} from "react-dnd";
import * as utils from "@/app/utils";
import classNames from "classnames";
import {NoteListStore} from "@/app/home/components/NoteList/state";
import {mutate} from "swr";
import type {Note} from "@/app/generated/prisma/browser";
import {NOTE_LIST_VIEW_MODE_TITLE_ONLY} from "@/app/home/components/NoteList/NoteListViewMode";
import {NoteContextMenu} from "@/app/home/components/NoteList/NoteContextMenu";
import {htmlToPlainText} from "@/lib/noteSummary";

const UNTITLED_NOTE_TITLE = "無題のノート";
const FALLBACK_TITLE_LENGTH = 32;

function getDisplayTitle(note: { title: string, content: string }): string {
  if (note.title !== UNTITLED_NOTE_TITLE) {
    return note.title;
  }

  const fallback = htmlToPlainText(note.content).substring(0, FALLBACK_TITLE_LENGTH);
  return fallback || UNTITLED_NOTE_TITLE;
}

export default function NoteCard(
  {
    note,
    noteListState,
    setSelectedNote,
    _ref,
    changed,
    needsLoadFullContent,
    isSelected,
    onKeyDown,
    onCtrlClick,
    onShiftClick,
  }: {
    note: Note,
    noteListState: NoteListStore,
    setSelectedNote: (note: Note) => void,
    _ref: React.Ref<HTMLButtonElement>,
    changed: { title: string, content: string } | undefined,
    needsLoadFullContent: boolean,
    isSelected: boolean,
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void,
    onCtrlClick: (note: Note) => void,
    onShiftClick: (note: Note) => void,
  }) {
  const isMultiSelected = noteListState.isMultiSelected(note);
  const isTitleOnly = noteListState.selectedViewMode.key === NOTE_LIST_VIEW_MODE_TITLE_ONLY;
  const [menuPos, setMenuPos] = useState<{ x: number, y: number } | null>(null);

  const [{}, refDrag] = useDrag(() => ({
    type: "note",
    item: noteListState.getDragSourceNotes(note),
    end: (item, monitor) => {
      if (monitor.didDrop()) {
        if (noteListState.multiSelectionMode) {
          noteListState.setMultiSelectionMode(false);
        }
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
  }), [noteListState]);

  const dateText = utils.dateToText(note.updatedAt ?? note.createdAt);
  const displayNote = changed ?? note;
  const displayTitle = getDisplayTitle(displayNote);
  const text = htmlToPlainText(displayNote.content).substring(0, 100);

  const openMenuFromTwoFingerTap = (ev: React.TouchEvent<HTMLButtonElement>) => {
    if (ev.touches.length !== 2) return;

    const [first, second] = [ev.touches[0], ev.touches[1]];
    ev.preventDefault();
    ev.stopPropagation();
    setMenuPos({
      x: (first.clientX + second.clientX) / 2,
      y: (first.clientY + second.clientY) / 2,
    });
  };

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await fetch(`/api/notes/${note.id}/toggleBookmark`, { method: 'POST' });
    mutate(`/api/folders/${note.folderId}`);
    mutate('/api/bookmarks');
  };

  const togglePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await fetch(`/api/notes/${note.id}/togglePin`, { method: 'POST' });
    mutate(`/api/folders/${note.folderId}`);
  };

  return (
    <>
    <button
      className="relative block w-full border-b-2 border-r border-gray-300 border-r-gray-200 text-start dark:border-gray-700 dark:border-r-gray-800"
      onContextMenu={(ev) => {
        ev.preventDefault();
        setMenuPos({x: ev.clientX, y: ev.clientY});
      }}
      onTouchStart={openMenuFromTwoFingerTap}
      onMouseDown={(ev) => {
        // 右クリック（コンテキストメニュー）では選択を変更しない。
        if (ev.button === 2) return;
        // Ctrl+クリックで通常選択モードなら、
        // 複数選択モードに入り現在のノートとクリックされたノートを選択状態にする。
        if (ev.ctrlKey) {
          onCtrlClick(note);
        }
        // Shift+クリックで通常選択モードなら、
        // 複数選択モードに入り現在のノートからクリックされたノートまでのノートを選択状態にする。
        else if (ev.shiftKey) {
          onShiftClick(note);
        }
        noteListState.setShouldScroll(false);

        setSelectedNote(note);
      }}
      // ドラッグするためのマウスダウンで選択状態が変わらないように
      // 選択状態の変更はクリックイベントで行う。
      onClick={() => {
        if (noteListState.multiSelectionMode) {
          noteListState.setMultiSelection(note, !isMultiSelected);
        }
      }}
      // onFocus={() => setSelectedNote(note)}
      onKeyDown={onKeyDown}
      ref={_ref}>

      {/*複数選択チェックボックス*/}
      <div className="absolute p-2 right-0">
        <input type="checkbox"
               className={classNames("w-4 h-4", {hidden: !noteListState.multiSelectionMode})}
               readOnly={true}
               checked={isMultiSelected}/>
      </div>

      {/*本体*/}
      <div className={classNames(
        "hover:bg-white dark:hover:bg-black hover:border-cyan-400 dark:hover:border-cyan-600 border-2 p-0.5 md:p-2",
        "flex flex-col",
        isSelected ? "border-blue-500 dark:border-blue-600 bg-white dark:bg-gray-900" : " border-gray-100 dark:border-gray-900",
      )}
           ref={refDrag as any}>
        {/*タイトル*/}
        <strong className={classNames(
          "line-clamp-2 text-xs md:text-base",
        )}>{displayTitle}</strong>

        {/*サマリー*/}
        {!isTitleOnly && <div className={"mt-2 h-12 md:h-[3.75rem] line-clamp-3 text-gray-600 dark:text-gray-400 text-xs leading-4 md:text-sm md:leading-5"}>{text}</div>}

        {/*日付と操作*/}
        <div className={classNames(
          "mt-2 flex items-center justify-between",
        )}>
          <div className={"text-[12px] text-gray-500"}>{dateText}</div>
          <div className="flex items-center gap-2">
            <div
              onMouseDown={togglePin}
              className={classNames("text-sm cursor-pointer", note.pinned ? "text-cyan-600 dark:text-cyan-400" : "text-gray-400")}
              title={note.pinned ? "ピン留めを解除" : "ピン留め"}
            >
              {note.pinned ? '📌' : '⌖'}
            </div>
            <div
              onMouseDown={toggleBookmark}
              className="text-sm cursor-pointer"
              title={note.bookmarked ? "ブックマークを解除" : "ブックマークに追加"}
            >
              {note.bookmarked ? '★' : '☆'}
            </div>
          </div>
        </div>
      </div>
    </button>

    {/*コンテキストメニュー*/}
    {menuPos && <NoteContextMenu
      note={note}
      changedContent={changed?.content}
      needsLoadFullContent={needsLoadFullContent}
      x={menuPos.x}
      y={menuPos.y}
      onClose={() => setMenuPos(null)}
    />}
    </>);
}
