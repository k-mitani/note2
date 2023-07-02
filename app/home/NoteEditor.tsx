import React, {useCallback, useDebugValue, useEffect, useRef, useState} from "react";
import Link from "next/link";
import * as utils from "@/app/utils";
import {format} from "date-fns";
import {Note} from "@prisma/client";
import {atoms} from "@/app/home/atoms";
import {useRecoilState, useRecoilValue} from "recoil";
import ContentEditable from 'react-contenteditable'
import {Simulate} from "react-dom/test-utils";
import change = Simulate.change;
import {useDebounce, useLocalStorage} from "usehooks-ts";

export default function NoteEditor({saveChanges, notes}: {
  saveChanges: () => void,
  notes: Note[] | null,
}) {
  const [note, setNote] = useRecoilState(atoms.selectedNote);
  const [autoSave, setAutoSave] = useLocalStorage("autoSave", true);
  const prevNote = useRef(note);
  const refHtml = useRef(note?.content ?? "");
  const [title, setTitle] = useState(note?.title ?? "");
  const [changedNotesWrapper, setChangedNotes] = useRecoilState(atoms.changedNotes);
  const [changedNotes] = changedNotesWrapper;
  const editingIsPaused = useDebounce(changedNotesWrapper, 3000);

  useEffect(() => {
    if (changedNotes.size === 0) return;
    if (!autoSave) return;
    console.log("do auto save");
    saveChanges();
  }, [editingIsPaused]);
  
  useEffect(() => {
    if (notes != null && note != null) {
      const noteInNotes = notes.find(n => n.id === note.id);
      if (noteInNotes != null && noteInNotes != note) {
        setNote(noteInNotes);
      }
    }
  }, [note, notes, setNote]);


  function addToChangedNotes(id: number, title: string, content: string) {
    setChangedNotes(([prev]) => {
      prev.set(id, {id, title, content});
      return [prev];
    });
  }

  // noteが更新されたら、refHtml.currentを更新する。
  if (note !== prevNote.current) {
    console.log("noteupdated", refHtml.current)
    prevNote.current = note;
    if (note != null) {
      const n = changedNotes.get(note.id) ?? note;
      refHtml.current = n.content;
      setTitle(n.title);
    } else {
      refHtml.current = "";
      setTitle("");
    }
  }

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
    const date = note.updatedAt || note.createdAt;
    timeText = date && format(date, "yyyy-MM-dd HH:mm") || "";
  }

  // ctrl+sで保存する。
  useEffect(() => {
    function handleKeyDown(ev: KeyboardEvent) {
      if (ev.ctrlKey && ev.key === "s") {
        console.log("ctrl+s")
        ev.preventDefault();
        saveChanges();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    }
  }, [note, saveChanges]);

  (window as any)["__aa"] = note;
  return <div className="grow bg-white flex flex-col">
    {/*ヘッダー*/}
    <div className={"border-b-2 border-gray-200 p-2"}
    >
      <input className="text-blue-500 w-full"
             type="text"
             onChange={ev => {
               setTitle(ev.target.value);
               console.log("hmm", ev.target.value);
               if (note != null) {
                 const content = changedNotes.get(note.id)?.content ?? note.content;
                 addToChangedNotes(note.id, ev.target.value, content);
               }
             }}
             value={title}></input>
      <div>
        <span className="text-xs text-gray-500">{timeText}</span>
        {link && (
          <span className="ml-1 text-xs text-blue-700">
            <Link href={link}>{linkText}</Link>
          </span>
        )}
      </div>
    </div>

    {/*本文*/}
    <div className="p-2 grow overflow-y-scroll break-all">
      <ContentEditable html={refHtml.current}

                       className="w-full h-full"
                       style={{outline: "0px solid #fff"}}
                       onChange={ev => {
                         console.log("onchange");
                         refHtml.current = ev.target.value
                         if (note != null) {
                           const title = changedNotes.get(note.id)?.title ?? note.title;
                           console.log("タイトル", changedNotes.get(note.id)?.title)
                           console.log("note.title", note.title);
                           console.log("title", title);
                           addToChangedNotes(note.id, title, ev.target.value);
                         }
                       }}
                       onBlur={() => console.log("onblur", refHtml.current)}
      />
    </div>
  </div>
}
