import Link from "next/link";
import React from "react";
import {format} from "date-fns";
import {useNote} from "@/app/home/state";

export function NoteHeader({
  title,
  setTitle,
  updatedAt,
  setUpdatedAt,
  changedNotes,
  addToChangedNotes,
}: {
  title: string,
  setTitle: (title: string) => void,
  updatedAt: Date | undefined,
  setUpdatedAt: (date: Date) => void,
  changedNotes: Map<number, { title: string, content: string, updatedAt: Date | null }>,
  addToChangedNotes: (id: number, title: string, content: string, updatedAt: Date | null) => void,
}) {
  const note = useNote(state => state.selectedNote);

  let link = null;
  let linkText = null;
  let timeText = "";
  if (note != null) {
    // 参照元のURLを取得する。
    for (let a of note.attributes as any[]) {
      if (a.Item1 === "source-url") {
        // URLのドメイン部だけを取得する。
        link = a.Item2
        linkText = a.Item2.replace(/^(https?:\/\/)([^\/]+).*$/, "$2");
      }
    }
    // 日付を取得する。
    timeText = updatedAt && format(updatedAt, "yyyy-MM-dd HH:mm") || "";
  }

  return <div className={"border-b-2 border-gray-200 dark:border-gray-600 p-2"}>
    <input className="text-blue-500 dark:bg-black dark:text-blue-500 w-full"
           type="text"
           onChange={ev => {
             setTitle(ev.target.value);
             if (note != null) {
               const content = changedNotes.get(note.id)?.content ?? note.content;
               addToChangedNotes(note.id, ev.target.value, content, null);
             }
           }}
           value={title}></input>
    <div>
      <input type="datetime-local"
             className="text-sm text-gray-500 border-gray-300"
             onChange={ev => {
               const datetime = new Date(ev.target.value);
               if (note != null) {
                 const title = changedNotes.get(note.id)?.title ?? note.title;
                 const content = changedNotes.get(note.id)?.content ?? note.content;
                 addToChangedNotes(note.id, title, content, datetime);
                 setUpdatedAt(datetime);
               }
             }}
             value={timeText}/>
      {link && (
        <span className="ml-1 text-xs text-blue-700">
          <Link href={link}>{linkText}</Link>
        </span>
      )}
    </div>
  </div>

}