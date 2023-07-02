"use client";

import React, {useCallback, useEffect} from "react";
import useSWR from "swr";
import SideBar from "@/app/home/SideBar";
import * as utils from "@/app/utils";
import NoteEditor from "@/app/home/NoteEditor";
import NoteListView from "@/app/home/NoteListView";
import {Folder, Note} from "@prisma/client";
import {RecoilRoot, useRecoilState} from "recoil";
import {atoms} from "@/app/home/atoms";
import {useFolderAndNotes, useFoldersAll} from "@/app/home/hooks";
import {Header} from "@/app/home/Header";


function HomeInternal() {
  // State
  const [selectedFolder, setSelectedFolder] = useRecoilState(atoms.selectedFolder);
  const [selectedNote, setSelectedNote] = useRecoilState(atoms.selectedNote);
  const [[changedNotes], setChangedNotes] = useRecoilState(atoms.changedNotes);

  // Data
  const {data: folders, error, isLoading} = useFoldersAll();
  const {data: notesParent, mutate: mutateNotesParent} = useFolderAndNotes(selectedFolder?.id);

  // 読み込み中なら何もしない。
  if (error) return <div>failed to load</div>
  if (isLoading) return <div>loading...</div>
  if (folders == null) return <div>folders is null</div>

  async function onCreateNewNote() {
    if (selectedFolder == null) return;
    const res = await fetch(
      `/api/folders/${selectedFolder.id}/createNote`,
      {method: "POST"}
    );
    const newNote = await res.json();
    utils.coerceDate(newNote, "createdAt");
    utils.coerceDate(newNote, "updatedAt");
    console.log(newNote);
    await mutateNotesParent();
    setSelectedNote(newNote);
  }

  async function saveChanges() {
    console.log(changedNotes);
    await fetch("/api/rpc/saveChanges", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        notes: Array.from(changedNotes.values()),
      }),
    });
    setChangedNotes([new Map<number, any>()]);
    await mutateNotesParent();
  }

  const notes = notesParent?.notes ?? [];
  return (
    <main className='h-full w-screen bg-red-200 flex flex-col'>
      <Header onCreateNewNote={onCreateNewNote} saveChanges={saveChanges}/>
      <div className="flex flex-grow h-[0%]">
        <SideBar/>

        <NoteListView notes={notes}/>

        <NoteEditor saveChanges={saveChanges}/>
      </div>
    </main>
  )
}

export default function Home() {
  return (
    <RecoilRoot>
      <HomeInternal/>
    </RecoilRoot>
  );
}
