import {format} from "date-fns";
import React from "react";

function dateToText(date: string) {
  if (date == null) return "";
  const year = parseInt(date.substring(0, 4));
  const month = parseInt(date.substring(4, 6)) - 1; // 月は0から11で表現されるため、1を引きます
  const day = parseInt(date.substring(6, 8));
  const hour = parseInt(date.substring(9, 11));
  const minute = parseInt(date.substring(11, 13));
  const second = parseInt(date.substring(13, 15));
  const d = new Date(Date.UTC(year, month, day, hour, minute, second));
  return format(d, 'yyyy/MM/dd');
}

function NoteCard({note}: any) {
  var dateText = note.UpdatedAt == null ?
    dateToText(note.CreatedAt) :
    `${dateToText(note.UpdatedAt)} | ${dateToText(note.CreatedAt)}`;

  return (
    <div className={"border-gray-200 border-b-2"}>
      <div className="h-32 hover:bg-white hover:border-blue-500 border-gray-100 border-2 p-2">
        <strong className="line-clamp-2">{note.Title}</strong>
        <div className={"text-xs text-gray-500"}>{dateText}</div>
      </div>
    </div>);
}

export default function NoteListView({notes, selectedNote, setSelectedNote}: any) {
  const noteCount = notes?.length ?? 0;

  return (
    <div className='flex-none w-72 h-screen overflow-y-scroll bg-gray-100'>
      <div className={"p-2 border-b-2 border-gray-400"}>
        <h2>ノート一覧 ({noteCount})</h2>
        <button className={"text-sm m-1 p-0.5 bg-gray-500 text-white"}>更新順↑</button>
        <button className={"text-sm m-1 p-0.5 bg-gray-500 text-white"}>サマリー</button>
        <input className={"m-1 border-2"} type="text" placeholder="ノートを検索" />
      </div>
      <ul>
        {notes?.map((note: any, i: number) => {
          console.log(note)
          return (
            <li key={note.name + "-" + i}
                onMouseDown={() => setSelectedNote(note)}>
              <NoteCard note={note}></NoteCard>
            </li>);
        })}
      </ ul>
    </div>
  )
}
