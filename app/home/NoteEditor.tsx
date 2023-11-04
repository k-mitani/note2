import React, {useCallback, useDebugValue, useEffect, useRef, useState} from "react";
import Link from "next/link";
import * as utils from "@/app/utils";
import {format} from "date-fns";
import {Note} from "@prisma/client";
import {atoms} from "@/app/home/atoms";
import {useRecoilState, useRecoilValue} from "recoil";
import ContentEditable from 'react-contenteditable'
import {useDebounce, useLocalStorage} from "usehooks-ts";
import {useHotkeys} from 'react-hotkeys-hook'

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
  const editingIsPaused = useDebounce(changedNotesWrapper, 10000);

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

  const hotkeysOptions = {
    enableOnFormTags: true,
    enableOnContentEditable: true,
  };
  const hotkeysOptionsPreventDefault = {
    preventDefault: true,
    ...hotkeysOptions,
  }

  const a = {
    "ctrl+b": ["bold"],
    "ctrl+u": ["underline"],
    "alt+shift+5": ["strikeThrough"],
    "ctrl+h": ["backColor", false, "yellow"],
    "ctrl+shift+r": ["foreColor", false, "red"],
    "ctrl+k": ["removeFormat"],
    "ctrl+o": ["insertOrderedList"],
    "ctrl+l": ["insertUnorderedList"],
    "ctrl+shift+h": ["insertHorizontalRule"],
    "ctrl+alt+1": ["formatBlock", false, "h1"],
    "ctrl+alt+2": ["formatBlock", false, "h2"],
    "ctrl+alt+3": ["formatBlock", false, "h3"],
    "ctrl+alt+4": ["formatBlock", false, "h4"],
    "ctrl+alt+5": ["formatBlock", false, "h5"],
    "ctrl+alt+6": ["formatBlock", false, "h6"],
  }
  for (let [key, args] of Object.entries(a)) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useHotkeys(key, () => {
      // @ts-ignore
      const result = document.execCommand(...args);
      console.log(key, result)
    }, hotkeysOptionsPreventDefault);
  }

  // ctrl+sで保存する。
  useHotkeys("ctrl+s", (ev: KeyboardEvent) => {
    console.log("ctrl+s")
    saveChanges();
  }, hotkeysOptionsPreventDefault);

  // tabキーでインデントする。
  useHotkeys("tab", (ev: KeyboardEvent) => {
    const editable = document.getElementById("NoteEditor-ContentEditable");
    const range = document.getSelection()?.getRangeAt(0);
    if (range == null) return;
    // editableの中の要素が選択されていないなら何もしない。
    if (editable == null || !editable.contains(range.startContainer)) return;

    if (range.startOffset === 0 || !range.collapsed) {
      document.execCommand("indent");
    }
    else {
      document.execCommand("insertText", false, "\t")
    }
    ev.preventDefault();
  }, hotkeysOptions);
  // shift+tabキーでアンインデントする。
  useHotkeys("shift+tab", (ev: KeyboardEvent) => {
    const editable = document.getElementById("NoteEditor-ContentEditable");
    const range = document.getSelection()?.getRangeAt(0);
    if (range == null) return;
    // editableの中の要素が選択されていないなら何もしない。
    if (editable == null || !editable.contains(range.startContainer)) return;
    document.execCommand("outdent");
    ev.preventDefault();
  }, hotkeysOptions);


  // EnterキーでURLをカードにする。
  useHotkeys("enter", (ev: KeyboardEvent) => {
    const editable = document.getElementById("NoteEditor-ContentEditable");
    const selection = document.getSelection()?.getRangeAt(0).startContainer;
    if (selection == null) return;
    if (editable == null || !editable.contains(selection)) return;

    const url = selection.textContent;
    const patternUrl = /^https?:\/\/[^\s]+$/;
    if (url != null && patternUrl.test(url)) {
      setTimeout(async () => {
        // URLの場合は、選択位置の次の場所にカードを挿入する。
        const res = await fetch("/getLinkPreview?url=" + url);
        const rawCard = await res.text();
        console.log("text", rawCard);
        const tmp = document.createElement("div");
        tmp.innerHTML = rawCard;
        const card = tmp.querySelector(".link-preview");
        selection.parentNode?.insertBefore(card!!, selection.nextSibling);
        if (note == null) return;
        addToChangedNotes(note.id, title, editable.innerHTML);
        refHtml.current = editable.innerHTML;
      });
    }
  }, hotkeysOptions);

  // Shift+Ctrl+Vでプレーンテキスト貼り付け。
  // 標準のShift+Ctrl+Vのプレーンテキスト貼り付けは、
  // カーソル移動がおかしくなるので自前で行う。
  useHotkeys("shift+ctrl+v", async (ev: KeyboardEvent) => {
    ev.preventDefault();
    const text = await navigator.clipboard.readText();
    const editable = document.getElementById("NoteEditor-ContentEditable");
    const selection = document.getSelection()?.getRangeAt(0).startContainer;
    if (selection == null) return;
    if (editable == null || !editable.contains(selection)) return;
    document.execCommand("insertText", false, text.replace(/\r/g, ""));
  }, hotkeysOptions);

  (window as any)["__aa"] = note;
  return <div className="grow bg-white dark:bg-black flex flex-col">
    {/*ヘッダー*/}
    <div className={"border-b-2 border-gray-200 dark:border-gray-600 p-2"}
    >
      <input className="text-blue-500 dark:bg-black dark:text-blue-500 w-full"
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
    <div className="p-2 grow overflow-y-scroll break-all dark:text-gray-300">
      <ContentEditable html={refHtml.current}
                       id="NoteEditor-ContentEditable"
                       className="w-full h-full"
                       style={{
                         outline: "0px solid #fff",
                         whiteSpace: "pre-wrap",
                         tabSize: 8,
                       }}
                       onChange={ev => {
                         // console.log("onchange");
                         refHtml.current = ev.target.value
                         if (note != null) {
                           const title = changedNotes.get(note.id)?.title ?? note.title;
                           // console.log("タイトル", changedNotes.get(note.id)?.title)
                           // console.log("note.title", note.title);
                           // console.log("title", title);
                           addToChangedNotes(note.id, title, ev.target.value);
                         }
                       }}
                       // onBlur={() => console.log("onblur", refHtml.current)}
      />
    </div>
  </div>
}
