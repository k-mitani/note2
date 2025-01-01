import React, {useCallback, useDebugValue, useEffect, useRef, useState} from "react";
import Link from "next/link";
import * as utils from "@/app/utils";
import {format} from "date-fns";
import {Note} from "@prisma/client";
import {useNote} from "@/app/home/state";
import ContentEditable from 'react-contenteditable'
import {useDebounce, useLocalStorage} from "usehooks-ts";
import {useHotkeys} from 'react-hotkeys-hook'
import {useFolderAndNotes, useSaveChanges} from "@/app/home/hooks";
import * as hooks from "@/app/home/components/NoteEditor/hooks";
import {NoteHeader} from "@/app/home/components/NoteEditor/NoteHeader";
import {useEnableImageResize} from "@/app/home/components/NoteEditor/hooks";

export default function NoteEditor() {
  const note = useNote(state => state.selectedNote);
  const setNote = useNote(state => state.setSelectedNote);

  const selectedFolder = useNote(state => state.selectedFolder);
  const {notes, isLoading: isLoadingNotes} = useFolderAndNotes(selectedFolder?.id);
  const saveChanges = useSaveChanges(selectedFolder?.id);

  const [autoSave, setAutoSave] = useLocalStorage("autoSave", true);
  const prevNote = useRef(note);
  const refHtml = useRef(note?.content ?? "");
  const [title, setTitle] = useState(note?.title ?? "");
  const [updatedAt, setUpdatedAt] = useState(note?.updatedAt ?? note?.createdAt);

  const changedNotesWrapper = useNote(state => state.changedNotes);
  const [changedNotes] = changedNotesWrapper;
  const addChangedNote = useNote(state => state.addChangedNote);
  const editingIsPaused = useDebounce(changedNotesWrapper, 10000);

  // 変換候補選択中ならtrue
  const showingImePopup = hooks.useShowingImePopup();

  useEffect(() => {
    if (changedNotes.size === 0) return;
    if (!autoSave) return;
    console.log("do auto save");
    saveChanges();
  }, [editingIsPaused]);

  useEffect(() => {
    if (!isLoadingNotes && note != null) {
      const noteInNotes = notes.find(n => n.id === note.id);
      if (noteInNotes != null && noteInNotes != note) {
        setNote(noteInNotes);
      }
    }
  }, [isLoadingNotes, note, notes, setNote]);


  function addToChangedNotes(id: number, title: string, content: string, updatedAt: Date | null = null) {
    // setChangedNotes(([prev]) => {
    //   var prevData = prev.get(id);
    //   prev.set(id, {id, title, content, updatedAt: updatedAt ?? prevData?.updatedAt ?? null});
    //   return [prev];
    // });
    // var prevData = changedNotes.get(id);
    // changedNotes.set(id, {id, title, content, updatedAt: updatedAt ?? prevData?.updatedAt ?? null});
    // setChangedNotes([changedNotes]);
    addChangedNote({id, title, content, updatedAt});
  }

  // noteが更新されたら、refHtml.currentを更新する。
  if (note !== prevNote.current) {
    console.log("noteupdated", refHtml.current)
    prevNote.current = note;
    if (note != null) {
      const n = changedNotes.get(note.id) ?? note;
      refHtml.current = n.content;
      setTitle(n.title);
      setUpdatedAt(n.updatedAt ?? (n as any).createdAt);
    } else {
      refHtml.current = "";
      setTitle("");
      setUpdatedAt(new Date());
    }
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
    } else if (!showingImePopup) {
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

  // Ctrl+Gで折りたたみ可能な枠で囲む。
  useHotkeys("ctrl+g", (ev: KeyboardEvent) => {
    ev.preventDefault();
    const editable = document.getElementById("NoteEditor-ContentEditable");
    const range = document.getSelection()?.getRangeAt(0);
    if (range == null) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'note-custom-foldable';
    const wrapperInner = document.createElement('div');
    range.surroundContents(wrapper);
    wrapper.appendChild(wrapperInner);
    // カーソルをセットする。
    const selection = window.getSelection()!;
    const newRange = document.createRange();
    newRange.setStart(wrapperInner, 0);
    newRange.setEnd(wrapperInner, 0);
    selection.removeAllRanges();
    selection.addRange(newRange);
    wrapperInner.focus();
  }, hotkeysOptions);

  // foldableの上部30pxをクリックすると折りたたむ。
  useEffect(() => {
    const editable = document.getElementById("NoteEditor-ContentEditable");
    if (editable == null) return;
    editable.addEventListener('click', onClick);

    function onClick(ev: MouseEvent) {
      const target = ev.target as HTMLElement;
      if (target.classList.contains('note-custom-foldable')) {
        ev.preventDefault();
        // 上部30pxをクリックした場合のみ折りたたむ。
        if (ev.offsetY < 30) {
          target.classList.toggle('folded');
        }
      }
    }

    return () => {
      editable.removeEventListener('click', onClick);
    }
  }, [note]);


  // EnterキーでURLをカードにする。
  useHotkeys("ctrl+enter", (ev: KeyboardEvent) => {
    ev.preventDefault();
    const editable = document.getElementById("NoteEditor-ContentEditable");
    const range = document.getSelection()!.getRangeAt(0);
    const selection = range.startContainer;
    if (selection == null) return;
    if (editable == null || !editable.contains(selection)) return;
    if (!range.collapsed) return;

    const url = selection.textContent;
    const patternUrl = /^https?:\/\/[^\s]+$/;
    if (url == null || !patternUrl.test(url)) return;
    if (url.length !== range.endOffset) return;
    setTimeout(async () => {
      const range = document.getSelection()!.getRangeAt(0);
      // URLの場合は、選択位置の次の場所にカードを挿入する。
      const res = await fetch("/getLinkPreview?url=" + url);
      const rawCard = await res.text();
      console.log("text", rawCard);
      const tmp = document.createElement("div");
      tmp.innerHTML = rawCard;
      const card = tmp.querySelector(".link-preview")!;
      if (card == null) return;
      range.insertNode(card);
      range.collapse();
      if (note == null) return;
      addToChangedNotes(note.id, title, editable.innerHTML);
      refHtml.current = editable.innerHTML;
    });
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

  // 画像のリサイズ
  hooks.useEnableImageResize();

  (window as any)["__aa"] = note;
  return <div className="grow bg-white dark:bg-black flex flex-col">
    {/*ヘッダー*/}
    <NoteHeader title={title}
                setTitle={setTitle}
                updatedAt={updatedAt}
                setUpdatedAt={setUpdatedAt}
                changedNotes={changedNotes}
                addToChangedNotes={addToChangedNotes}
    />

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
                       onPaste={hooks.onPaste}
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