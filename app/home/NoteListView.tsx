import {format} from "date-fns";
import React, {useEffect, useMemo, useRef, useState} from "react";
import * as utils from "@/app/utils";
import {z} from "zod";
import {Note} from "@prisma/client";
import {useRecoilState, useRecoilValue} from "recoil";
import {atoms} from "@/app/home/atoms";
import classNames from "classnames";
import {useRecoilLocalStorage} from "@/app/utils";

function NoteCard({note, changed, isSelected}: { note: Note, changed: {title: string, content: string} | undefined, isSelected: boolean }) {
  const dateText = utils.dateToText(note.updatedAt ?? note.createdAt);
  const text = (changed ?? note).content.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, "")
  return (
    <div className={"border-gray-300 border-b-2"}>
      <div className={
        "flex flex-col hover:bg-white hover:border-cyan-400 border-2 p-2"
        + (isSelected ? " border-blue-500 bg-white" : " border-gray-100")
      }>
        <strong className="line-clamp-2">{(changed ?? note).title}</strong>
        <div className={"mt-2 h-16 line-clamp-3 text-gray-600 text-sm"}>{text}</div>
        <div className={"mt-2 text-[12px] text-gray-500"}>{dateText}</div>
      </div>
    </div>);
}


const orderItems = [
  ["更新順↓", (a: Note, b: Note) => (b.updatedAt ?? b.createdAt).getTime() - (a.updatedAt ?? a.createdAt).getTime()],
  ["更新順↑", (a: Note, b: Note) => (a.updatedAt ?? a.createdAt).getTime() - (b.updatedAt ?? b.createdAt).getTime()],
  ["作成順↓", (a: Note, b: Note) => b.createdAt.getTime() - a.createdAt.getTime()],
  ["作成順↑", (a: Note, b: Note) => a.createdAt.getTime() - b.createdAt.getTime()],
  ["名前順↓", (a: Note, b: Note) => a.title.localeCompare(b.title)],
  ["名前順↑", (a: Note, b: Note) => b.title.localeCompare(a.title)],
];

export default function NoteListView({notes}: {
  notes: Note[] | null,
}) {
  const [selectedNote, setSelectedNote] = useRecoilState(atoms.selectedNote);
  const [selectedOrder, setSelectedOrder] = useState(0);
  const [showOrderItems, setShowOrderItems] = useState(false);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [[changedNotes], setChangedNotes] = useRecoilState(atoms.changedNotes);
  const [showNoteListView, setShowNoteListView] = useRecoilLocalStorage(atoms.showNoteListView);

  const noteCount = notes?.length ?? 0;
  const orderName = (String)(orderItems[selectedOrder][0]);
  const orderFunc = orderItems[selectedOrder][1];
  const refSelectedNoteElement = useRef<Element>(null);
  notes = useMemo(() => {
    if (notes == null) return null;
    console.log("sort notes");
    return notes.sort(orderFunc as any);
  }, [notes, selectedOrder]);

  if (notes == null) return <div>loading...</div>

  console.log("render notes");
  function onKeyDoen(ev: React.KeyboardEvent) {
    if (notes == null) return;
    if (selectedNote == null) {
      setSelectedNote(notes[0]);
      setShouldScroll(true);
    } else if (ev.key === "ArrowDown") {
      const nextNote = notes[Math.min(notes.indexOf(selectedNote) + 1, notes.length - 1)];
      setSelectedNote(nextNote);
      setShouldScroll(true);
    } else if (ev.key === "ArrowUp") {
      const nextNote = notes[Math.max(notes.indexOf(selectedNote) - 1, 0)];
      setSelectedNote(nextNote);
      setShouldScroll(true);
    }
  }

  if (shouldScroll && refSelectedNoteElement.current != null) {
    refSelectedNoteElement.current.scrollIntoView({block: "center"});
    setShouldScroll(false);
  }

  return (
    <div className={classNames('flex-none w-72 overflow-y-scroll bg-gray-100',
      {'hidden': !showNoteListView},
      )}
         tabIndex={0}
         onKeyDown={onKeyDoen}>
      <div className={"p-2 border-b-2 border-gray-400"}>
        <h2>ノート一覧 ({noteCount})</h2>
        <span className={""}>
          <span className={[
            "bg-white border-2 border-gray-600",
            "block absolute ml-[-80px]",
            showOrderItems ? "" : " hidden",
          ].join(" ")}>
            <ul>
              {orderItems.map((order: any, i) =>
                <li key={i}
                    className={"hover:bg-blue-300 p-0.5 cursor-pointer"}
                    onClick={() => setSelectedOrder(i)}>{order[0]}</li>
              )}
            </ul>
          </span>
        </span>
        <button className={"text-sm m-1 p-0.5 bg-gray-500 text-white"}
                onClick={() => setShowOrderItems(!showOrderItems)}>
          {orderName}
        </button>
        <button className={"text-sm m-1 p-0.5 bg-gray-500 text-white"}>サマリー</button>
        <input className={"m-1 border-2"} type="text" placeholder="ノートを検索"/>
      </div>
      <ul>
        {notes?.map((note: any, i: number) => {
          return (
            <li key={note.name + "-" + i}
                onMouseDown={() => setSelectedNote(note)}
                ref={selectedNote === note ? refSelectedNoteElement : null as any}
            >
              <NoteCard note={note} changed={changedNotes.get(note.id)} isSelected={selectedNote === note}></NoteCard>
            </li>);
        })}
      </ ul>
    </div>
  )
}
