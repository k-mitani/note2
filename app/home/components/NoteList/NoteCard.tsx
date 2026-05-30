import React from "react";
import {useDrag} from "react-dnd";
import * as utils from "@/app/utils";
import classNames from "classnames";
import {NoteListStore} from "@/app/home/components/NoteList/state";
import {mutate} from "swr";
import {Note} from "@prisma/client";
import {NOTE_LIST_VIEW_MODE_TITLE_ONLY} from "@/app/home/components/NoteList/NoteListViewMode";

export default function NoteCard(
  {
    note,
    noteListState,
    setSelectedNote,
    _ref,
    changed,
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
    isSelected: boolean,
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void,
    onCtrlClick: (note: Note) => void,
    onShiftClick: (note: Note) => void,
  }) {
  const isMultiSelected = noteListState.isMultiSelected(note);
  const isTitleOnly = noteListState.selectedViewMode.key === NOTE_LIST_VIEW_MODE_TITLE_ONLY;

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
  const text = (changed ?? note).content
    .replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, "")
    .trim()
    .substring(0, 100);

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
    <button
      className="relative w-full text-start block border-gray-300 dark:border-gray-700 border-b-2"
      onMouseDown={(ev) => {
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
        isTitleOnly ? "flex items-center gap-2" : "flex flex-col",
        isSelected ? "border-blue-500 dark:border-blue-600 bg-white dark:bg-gray-900" : " border-gray-100 dark:border-gray-900",
      )}
           ref={refDrag as any}>
        {/*タイトル*/}
        <strong className={classNames(
          "text-xs md:text-base",
          isTitleOnly ? "min-w-0 flex-grow truncate" : "line-clamp-2",
        )}>{(changed ?? note).title}</strong>

        {/*サマリー*/}
        {!isTitleOnly && <div className={"mt-2 h-16 line-clamp-3 text-gray-600 dark:text-gray-400 text-xs md:text-sm"}>{text}</div>}

        {/*日付と操作*/}
        <div className={classNames(
          "flex items-center",
          isTitleOnly ? "flex-none gap-2" : "mt-2 justify-between",
        )}>
          {!isTitleOnly && <div className={"text-[12px] text-gray-500"}>{dateText}</div>}
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
    </button>);
}
