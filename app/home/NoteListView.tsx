import React, {useEffect, useMemo, useRef, useState} from "react";
import * as utils from "@/app/utils";
import {Note} from "@prisma/client";
import {useRecoilState, useRecoilValue} from "recoil";
import {atoms} from "@/app/home/atoms";
import classNames from "classnames";
import {useRecoilLocalStorage} from "@/app/utils";
import {useDrag} from "react-dnd";

function NoteCard(
  {
    note,
    getDragSourceNotes,
    multiSelectionMode,
    setMultiSelectionMode,
    isMultiSelected,
    setMultiSelection,
    setShouldScroll,
    setSelectedNote,
    _ref,
    changed,
    isSelected,
    onKeyDown,
    onCtrlClick,
    onShiftClick,
  }: {
    note: Note,
    getDragSourceNotes: () => { notes: Note[] } | null
    multiSelectionMode: boolean,
    setMultiSelectionMode: (b: boolean) => void,
    isMultiSelected: boolean,
    setMultiSelection: (note: Note, b: boolean) => void,
    setShouldScroll: (b: boolean) => void,
    setSelectedNote: (note: Note) => void,
    _ref: React.Ref<HTMLButtonElement>,
    changed: { title: string, content: string } | undefined,
    isSelected: boolean,
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void,
    onCtrlClick: (note: Note) => void,
    onShiftClick: (note: Note) => void,
  }) {
  const [{}, refDrag] = useDrag(() => ({
    type: "note",
    item: getDragSourceNotes,
    end: (item, monitor) => {
      if (monitor.didDrop()) {
        if (multiSelectionMode) {
          setMultiSelectionMode(false);
        }
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
  }), [getDragSourceNotes]);

  const dateText = utils.dateToText(note.updatedAt ?? note.createdAt);
  const text = (changed ?? note).content.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, "")
  return (
    <button className="relative w-full text-start block border-gray-300 dark:border-gray-600 border-b-2"
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
              setShouldScroll(false);

              setSelectedNote(note);
            }}
            // ドラッグするためのマウスダウンで選択状態が変わらないように
            // 選択状態の変更はクリックイベントで行う。
            onClick={() => {
              if (multiSelectionMode) {
                setMultiSelection(note, !isMultiSelected);
              }
            }}
            // onFocus={() => setSelectedNote(note)}
            onKeyDown={onKeyDown}
            ref={_ref}>
      {/*複数選択チェックボックス*/}
      <div className="absolute p-2 right-0">
        <input type="checkbox"
               className={classNames("w-4 h-4", {hidden: !multiSelectionMode})}
               readOnly={true}
               checked={isMultiSelected}/>
      </div>

      {/*本体*/}
      <div className={classNames(
        "flex flex-col hover:bg-white dark:hover:bg-black hover:border-cyan-400 dark:hover:border-cyan-600 border-2 p-0.5 md:p-2",
        isSelected ? "border-blue-500 dark:border-blue-600 bg-white dark:bg-gray-900" : " border-gray-100 dark:border-gray-800",
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


const orderItems = [
  ["更新順↓", (a: Note, b: Note) => (b.updatedAt ?? b.createdAt).getTime() - (a.updatedAt ?? a.createdAt).getTime()],
  ["更新順↑", (a: Note, b: Note) => (a.updatedAt ?? a.createdAt).getTime() - (b.updatedAt ?? b.createdAt).getTime()],
  ["作成順↓", (a: Note, b: Note) => b.createdAt.getTime() - a.createdAt.getTime()],
  ["作成順↑", (a: Note, b: Note) => a.createdAt.getTime() - b.createdAt.getTime()],
  ["名前順↓", (a: Note, b: Note) => a.title.localeCompare(b.title)],
  ["名前順↑", (a: Note, b: Note) => b.title.localeCompare(a.title)],
];

/**
 * ノート一覧
 * @param notes
 */
export default function NoteListView({notes}: {
  notes: Note[] | null,
}) {
  const [selectedNote, setSelectedNote] = useRecoilState(atoms.selectedNote);
  const [selectedOrder, setSelectedOrder] = useState(0);
  const [shouldScroll, setShouldScroll] = useState(true);
  const [showOrderItems, setShowOrderItems] = useState(false);
  const [[changedNotes], setChangedNotes] = useRecoilState(atoms.changedNotes);
  const [showNoteListView, setShowNoteListView] = useRecoilLocalStorage(atoms.showNoteListView);
  const [multiSelectionMode, setMultiSelectionMode] = useState(false);
  const [multiSelectionNotes, setMultiSelectionNotes] = useState<{ v: Set<Note> }>({v: new Set()});

  function isMultiSelected(note: Note) {
    return multiSelectionNotes.v.has(note);
  }

  function setMultiSelection(note: Note, on: boolean) {
    if (on) {
      multiSelectionNotes.v.add(note);
      setMultiSelectionNotes({v: multiSelectionNotes.v});
    } else {
      multiSelectionNotes.v.delete(note);
      setMultiSelectionNotes({v: multiSelectionNotes.v});
    }
  }

  function getDragSourceNotes(): { notes: Note[] } | null {
    if (!multiSelectionMode) {
      return {notes: [selectedNote as Note]};
    }
    const notes = Array.from(multiSelectionNotes.v);
    return notes.length > 0 ? {notes} : null;
  }

  const noteCount = notes?.length ?? 0;
  const orderName = (String)(orderItems[selectedOrder][0]);
  const orderFunc = orderItems[selectedOrder][1];
  const refSelectedNoteElement = useRef<Element>(null);
  notes = useMemo(() => {
    if (notes == null) return null;
    console.log("sort notes");
    setShouldScroll(true);
    return notes.sort(orderFunc as any);
  }, [notes, selectedOrder]);

  useEffect(() => {
    console.log("scroll b", refSelectedNoteElement.current)
    if (refSelectedNoteElement.current == null) return;

    // 他の場所にフォーカスがあるならフォーカスしない。
    if (document.activeElement == null ||
      document.getElementById("note-list")?.contains(document.activeElement)) {
      (refSelectedNoteElement.current as HTMLElement).focus();
    }

    console.log("scroll", refSelectedNoteElement.current)
    if (shouldScroll) {
      refSelectedNoteElement.current.scrollIntoView({block: "center"});
      setShouldScroll(false);
    }
  }, [refSelectedNoteElement.current]);

  if (notes == null) return <div>loading...</div>

  console.log("render notes");

  function onKeyDown(ev: React.KeyboardEvent) {
    if (notes == null) return;

    // ctrl+aなら全選択する。
    if (ev.ctrlKey && ev.key === "a") {
      ev.preventDefault();
      setMultiSelectionMode(true);
      setMultiSelectionNotes({v: new Set(notes)});
      return;
    }

    let index = -1;
    if (ev.key === "ArrowDown") {
      if (selectedNote == null) index = 0;
      else index = Math.min(notes.indexOf(selectedNote) + 1, notes.length - 1);
    } else if (ev.key === "ArrowUp") {
      if (selectedNote == null) index = 0;
      else index = Math.max(notes.indexOf(selectedNote) - 1, 0);
    }
    if (index >= 0) {
      const nextNote = notes[index];
      (document.querySelector(`#note-${index} button`) as HTMLElement).focus();
      setSelectedNote(nextNote);
      // シフトキーが押されていたら、複数選択モードにして選択する。
      if (ev.shiftKey) {
        // 現在が選択モードでなければ、選択モードにして今まで選択していたノートも選択する。
        if (!multiSelectionMode) {
          setMultiSelectionMode(true);
          setMultiSelectionNotes({v: new Set([selectedNote, nextNote] as Note[])});
        } else {
          setMultiSelection(nextNote, true);
        }
      }
    }
  }

  function onCtrlClick(note: Note) {
    if (!multiSelectionMode) {
      setMultiSelectionMode(true);
      setMultiSelectionNotes({v: new Set([selectedNote, note] as Note[])});
    }
    else {
      // デフォルトの処理に任せる。
    }
  }
  function onShiftClick(note: Note) {
    const start = notes!.indexOf(selectedNote as Note);
    const end = notes!.indexOf(note);
    const [a, b] = start < end ? [start, end] : [end, start];
    const newNotes = notes!.slice(a, b + 1);
    // すでに複数選択状態なら
    if (multiSelectionMode) {
      for (const n of newNotes) {
        setMultiSelection(n, true);
      }
    }
    else {
      setMultiSelectionMode(true);
      setMultiSelectionNotes({v: new Set(newNotes)});
    }
  }

  return (
    <div className={classNames(
      'flex flex-1 flex-col h-0 basis-80 md:flex-none md:h-full w-48 md:w-72',
      'bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
      {'hidden': !showNoteListView},
    )}>
      {/*ヘッダー*/}
      <div className={"flex-none p-1 border-b-2 border-gray-300 dark:border-gray-600"}>
        <h2>ノート一覧 ({noteCount})</h2>
        {/*ソート設定リスト*/}
        <span>
          <span className={classNames(
            "bg-white dark:bg-gray-800 border-2 border-gray-600",
            "block absolute ml-[-80px]",
            showOrderItems ? "" : " hidden",
          )}>
            <ul>
              {orderItems.map((order: any, i) =>
                <li key={i}
                    className={"hover:bg-blue-300 dark:hover:bg-blue-800 p-0.5 cursor-pointer"}
                    onClick={() => setSelectedOrder(i)}>{order[0]}</li>
              )}
            </ul>
          </span>
        </span>
        {/*ソートボタン*/}
        <button className={"text-sm m-1 p-0.5 bg-gray-500 text-white dark:bg-gray-600 dark:text-gray-300"}
                onClick={() => setShowOrderItems(!showOrderItems)}>
          {orderName}
        </button>

        {/*表示形式*/}
        {/*<button className={"text-sm m-1 p-0.5 bg-gray-500 text-white"}>サマリー</button>*/}

        {/*複数選択*/}
        <button className={classNames(
          "text-sm m-1 w-16 p-0.5 bg-gray-500 text-white dark:bg-gray-600 dark:text-gray-300",
          multiSelectionMode ? "bg-blue-500" : "",
        )}
                onClick={() => {
                  if (multiSelectionMode) {
                    setMultiSelectionMode(false);
                  } else {
                    setMultiSelectionNotes({v: new Set()});
                    setMultiSelectionMode(true);
                  }
                }}>選択 {multiSelectionMode && `(${multiSelectionNotes.v.size})`}
        </button>

        {/*検索*/}
        <input className={"m-1 border-2 dark:bg-gray-700 dark:border-gray-700"} type="text" placeholder="ノートを検索"/>
      </div>

      {/*一覧*/}
      <ul id="note-list" className="flex-grow overflow-y-scroll">
        {notes?.map((note: any, i: number) => {
          return (
            <li key={note.name + "-" + i} id={`note-${i}`}>
              <NoteCard note={note}
                        getDragSourceNotes={getDragSourceNotes}
                        multiSelectionMode={multiSelectionMode}
                        setMultiSelectionMode={setMultiSelectionMode}
                        isMultiSelected={isMultiSelected(note)}
                        setMultiSelection={setMultiSelection}
                        setShouldScroll={setShouldScroll}
                        setSelectedNote={setSelectedNote}
                        _ref={selectedNote === note ? refSelectedNoteElement : null as any}
                        onKeyDown={onKeyDown}
                        changed={changedNotes.get(note.id)}
                        isSelected={selectedNote === note}
                        onCtrlClick={onCtrlClick}
                        onShiftClick={onShiftClick}
              />
            </li>);
        })}
      </ ul>
    </div>
  )
}
