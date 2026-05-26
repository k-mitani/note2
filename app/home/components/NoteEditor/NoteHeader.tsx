import Link from "next/link";
import React from "react";
import {format} from "date-fns";
import {useNote} from "@/app/home/state";
import {mutate} from "swr";

export function NoteHeader({
  title,
  setTitle,
  updatedAt,
  setUpdatedAt,
  createdAt,
  setCreatedAt,
  changedNotes,
  addToChangedNotes,
}: {
  title: string,
  setTitle: (title: string) => void,
  updatedAt: Date | undefined,
  setUpdatedAt: (date: Date) => void,
  createdAt: Date | undefined,
  setCreatedAt: (date: Date) => void,
  changedNotes: Map<number, { title: string, content: string, updatedAt: Date | null, createdAt: Date | null }>,
  addToChangedNotes: (id: number, title: string, content: string, updatedAt: Date | null, createdAt: Date | null) => void,
}) {
  const note = useNote(state => state.selectedNote);

  const toggleBookmark = async () => {
    if (!note) return;
    await fetch(`/api/notes/${note.id}/toggleBookmark`, { method: 'POST' });
    // フォルダーとブックマーク一覧を再取得
    mutate(`/api/folders/${note.folderId}`);
    mutate('/api/bookmarks');
  };

  let link = null;
  let linkText = null;
  let timeText = "";
  let createdAtText = "";
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
    createdAtText = createdAt && format(createdAt, "yyyy-MM-dd HH:mm") || "";
  }

  return <div className={"border-b-2 border-gray-200 dark:border-gray-600 p-2"}>
    <div className="flex items-center gap-2">
      <input className="text-blue-500 dark:bg-black dark:text-blue-500 flex-1"
             type="text"
             onChange={ev => {
               setTitle(ev.target.value);
               if (note != null) {
                 const content = changedNotes.get(note.id)?.content ?? note.content;
                 addToChangedNotes(note.id, ev.target.value, content, null, null);
               }
             }}
             value={title}></input>
      {note && (
        <button
          onClick={toggleBookmark}
          className="text-xl"
          title={note.bookmarked ? "ブックマークを解除" : "ブックマークに追加"}
        >
          {note.bookmarked ? '★' : '☆'}
        </button>
      )}
    </div>
    <div className="flex items-center gap-3 flex-wrap">
      <label className="flex items-center gap-1 text-sm text-gray-500">
        <span>作成</span>
        <input type="datetime-local"
               className="text-sm text-gray-500 border-gray-300"
               onChange={ev => {
                 const datetime = new Date(ev.target.value);
                 if (note != null) {
                   const title = changedNotes.get(note.id)?.title ?? note.title;
                   const content = changedNotes.get(note.id)?.content ?? note.content;
                   const prevUpdatedAt = changedNotes.get(note.id)?.updatedAt ?? null;
                   addToChangedNotes(note.id, title, content, prevUpdatedAt, datetime);
                   setCreatedAt(datetime);
                 }
               }}
               value={createdAtText}/>
      </label>
      <label className="flex items-center gap-1 text-sm text-gray-500">
        <span>更新</span>
        <input type="datetime-local"
               className="text-sm text-gray-500 border-gray-300"
               onChange={ev => {
                 const datetime = new Date(ev.target.value);
                 if (note != null) {
                   const title = changedNotes.get(note.id)?.title ?? note.title;
                   const content = changedNotes.get(note.id)?.content ?? note.content;
                   const prevCreatedAt = changedNotes.get(note.id)?.createdAt ?? null;
                   addToChangedNotes(note.id, title, content, datetime, prevCreatedAt);
                   setUpdatedAt(datetime);
                 }
               }}
               value={timeText}/>
      </label>
      {link && (
        <span className="text-xs text-blue-700">
          <Link href={link}>{linkText}</Link>
        </span>
      )}
    </div>
  </div>

}