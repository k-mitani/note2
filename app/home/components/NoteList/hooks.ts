import React, {useEffect, useMemo, useRef} from "react";
import {Note} from "@prisma/client";
import {useNote} from "@/app/home/state";
import {useNoteList} from "@/app/home/components/NoteList/state";

export function useListOrder(notesRaw: Note[]) {
  const selectedOrder = useNoteList(state => state.selectedOrder);
  const shouldScroll = useNoteList(state => state.shouldScroll);
  const setShouldScroll = useNoteList(state => state.setShouldScroll);

  const orderFunc = selectedOrder.comp;
  const refSelectedNoteElement = useRef<Element>(null);
  const notes = useMemo(() => {
    console.log("sort notes");
    setShouldScroll(true);
    return notesRaw.sort(orderFunc as any);
  }, [notesRaw, selectedOrder]);

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

  return {notes, refSelectedNoteElement};
}


export function useKeyEventHandlers(notes: Note[]) {
  const selectedNote = useNote(state => state.selectedNote);
  const setSelectedNote = useNote(state => state.setSelectedNote);
  const multiSelectionMode = useNoteList(state => state.multiSelectionMode);
  const setMultiSelectionMode = useNoteList(state => state.setMultiSelectionMode);
  const setMultiSelection = useNoteList(state => state.setMultiSelection);
  const setMultiSelectionNotes = useNoteList(state => state.setMultiSelectionNotes);

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
    } else {
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
    } else {
      setMultiSelectionMode(true);
      setMultiSelectionNotes({v: new Set(newNotes)});
    }
  }

  return {
    onKeyDown,
    onCtrlClick,
    onShiftClick,
  }
}