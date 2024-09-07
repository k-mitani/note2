"use client";

import React, {useCallback, useEffect} from "react";
import useSWR, {mutate} from "swr";
import SideBar from "@/app/home/components/SideBar";
import * as utils from "@/app/utils";
import NoteEditor from "@/app/home/components/NoteEditor";
import NoteListView from "@/app/home/components/NoteListView";
import {useNote} from "@/app/home/state";
import {Folder, Note} from "@prisma/client";
import {useFolderAndNotes, useFoldersAll} from "@/app/home/hooks";
import {Header} from "@/app/home/components/Header";
import {DndProvider} from "react-dnd";
import {HTML5Backend} from "react-dnd-html5-backend";
import {HotkeysProvider} from "react-hotkeys-hook";


function HomeInternal() {
  // State
  const selectedFolder = useNote(state => state.selectedFolder);
  const [changedNotes] = useNote(state => state.changedNotes);
  const setSelectedFolder = useNote(state => state.setSelectedFolder);
  const setSelectedNote = useNote(state => state.setSelectedNote);
  const clearChangedNotes = useNote(state => state.clearChangedNotes);

  // Data
  const {data: folders, error, isLoading} = useFoldersAll();
  const {data: notesParent, mutate: mutateNotesParent} = useFolderAndNotes(selectedFolder?.id);

  // 初回のみ、最初のフォルダを選択する。
  useEffect(() => {
    if (selectedFolder == null && folders != null && folders.folders.length > 0) {
      setSelectedFolder(folders.folders[0] as any);
    }
  }, [folders, selectedFolder, setSelectedFolder]);


  // 読み込み中なら何もしない。
  if (error) return <div className="h-full w-screen bg-gray-700 text-white">failed to load</div>
  if (isLoading) return <div className="h-full w-screen bg-gray-700 text-white">loading...</div>
  if (folders == null) return <div className="h-full w-screen bg-gray-700 text-white">folders is null</div>

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
    await Promise.all([
      mutateNotesParent(),
      mutate("/api/rpc/getFoldersAll"),
    ]);
    setSelectedNote(newNote);
  }

  async function saveChanges() {
    console.log("saveChanges", changedNotes);
    await fetch("/api/rpc/saveChanges", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        notes: Array.from(changedNotes.values()),
      }),
    });
    clearChangedNotes()
    await Promise.all([
      mutateNotesParent(),
      mutate("/api/rpc/getFoldersAll"),
    ]);
  }

  async function onDropToFolder(ev: { target: Folder, notes: Note[] | null, folders: Folder[] | null }) {
    if (ev.notes != null) {
      await fetch("/api/rpc/moveNotes/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          folderId: ev.target.id,
          noteIds: ev.notes.map(n => n.id),
        })
      });

      mutateNotesParent();
      mutate("/api/rpc/getFoldersAll");
    }
    if (ev.folders != null) {
      await fetch("/api/rpc/moveFolders/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          parentFolderId: ev.target.id,
          folderIds: ev.folders.map(n => n.id).filter(id => id !== ev.target.id),
        })
      });

      mutateNotesParent();
      mutate("/api/rpc/getFoldersAll");
    }
  }


  const notes = notesParent?.notes ?? [];
  return (
    <main className='h-full w-screen bg-red-200 flex flex-col'>
      <Header onCreateNewNote={onCreateNewNote} saveChanges={saveChanges}/>
      <div className="flex flex-grow h-[0%]">
        <div className="flex flex-col md:flex-row">
          <SideBar onDropToFolder={onDropToFolder}/>
          <NoteListView notes={notes}/>
        </div>
        <HotkeysProvider>
          <NoteEditor notes={notes} saveChanges={saveChanges}/>
        </HotkeysProvider>
      </div>
    </main>
  )
}

export default function Home() {
  return (
    <DndProvider backend={HTML5Backend}>
      <HomeInternal/>
    </DndProvider>
  );
}
