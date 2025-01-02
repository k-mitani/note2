import {Note} from "@prisma/client";
import React from "react";
import {useDrag} from "react-dnd";
import * as utils from "@/app/utils";
import classNames from "classnames";
import {NoteListStore} from "@/app/home/components/NoteList/state";

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
  const text = (changed ?? note).content.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, "")
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
        "flex flex-col hover:bg-white dark:hover:bg-black hover:border-cyan-400 dark:hover:border-cyan-600 border-2 p-0.5 md:p-2",
        isSelected ? "border-blue-500 dark:border-blue-600 bg-white dark:bg-gray-900" : " border-gray-100 dark:border-gray-900",
      )}
           ref={refDrag}>
        {/*タイトル*/}
        <strong className="text-xs md:text-base line-clamp-2">{(changed ?? note).title}</strong>

        {/*サマリー*/}
        <div className={"mt-2 h-16 line-clamp-3 text-gray-600 dark:text-gray-400 text-xs md:text-sm"}>{text}</div>

        {/*日付*/}
        <div className={"mt-2 text-[12px] text-gray-500"}>{dateText}</div>
      </div>
    </button>);
}
