import {format} from "date-fns";
import React, {useState} from "react";
import * as utils from "@/app/utils";

function NoteCard({note, isSelected}: any) {
  var dateText = note.UpdatedAt == null ?
    utils.dateToText(note.CreatedAt) :
    `${utils.dateToText(note.UpdatedAt)}`;
  var text = note.Content.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, "")
  return (
    <div className={"border-gray-300 border-b-2"}>
      <div className={
        "flex flex-col hover:bg-white hover:border-cyan-400 border-gray-100 border-2 p-2"
        + (isSelected ? " border-blue-500 bg-white" : "")
      }>
        <strong className="line-clamp-2">{note.Title}</strong>
        <div className={"mt-2 h-16 line-clamp-3 text-gray-600 text-sm"}>{text}</div>
        <div className={"mt-2 text-[12px] text-gray-500"}>{dateText}</div>
      </div>
    </div>);
}


const orderItems = [
  ["更新順↓", (a: any, b: any) => utils.parseDate(b.UpdatedAt ?? b.CreatedAt).getTime() - utils.parseDate(a.UpdatedAt ?? a.CreatedAt).getTime()],
  ["更新順↑", (a: any, b: any) => utils.parseDate(a.UpdatedAt ?? a.CreatedAt).getTime() - utils.parseDate(b.UpdatedAt ?? b.CreatedAt).getTime()],
  ["作成順↓", (a: any, b: any) => utils.parseDate(b.CreatedAt).getTime() - utils.parseDate(a.CreatedAt).getTime()],
  ["作成順↑", (a: any, b: any) => utils.parseDate(a.CreatedAt).getTime() - utils.parseDate(b.CreatedAt).getTime()],
  ["名前順↓", (a: any, b: any) => a.Title.localeCompare(b.Title)],
  ["名前順↑", (a: any, b: any) => b.Title.localeCompare(a.Title)],
];

export default function NoteListView({notes, selectedNote, setSelectedNote}: any) {
  const noteCount = notes?.length ?? 0;
  const [selectedOrder, setSelectedOrder] = useState(0);
  const orderName = (String)(orderItems[selectedOrder][0]);
  const orderFunc = orderItems[selectedOrder][1];
  notes = notes?.sort(orderFunc);

  const [showOrderItems, setShowOrderItems] = useState(false);

  function onSelectOrder(i: number) {
    setSelectedOrder(i);
    // setShowOrderItems(false);
  }

  return (
    <div className='flex-none w-72 h-screen overflow-y-scroll bg-gray-100'>
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
                onMouseDown={() => setSelectedNote(note)}>
              <NoteCard note={note} isSelected={note === selectedNote}></NoteCard>
            </li>);
        })}
      </ ul>
    </div>
  )
}
