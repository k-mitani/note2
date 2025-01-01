"use client";

import React, {useEffect} from "react";
import FolderListView from "@/app/home/components/FolderList/FolderListView";
import NoteEditor from "@/app/home/components/NoteEditor/NoteEditor";
import NoteListView from "@/app/home/components/NoteList/NoteListView";
import {useNote} from "@/app/home/state";
import {useFolderAndNotes, useFoldersAll, useOnCreateNewNote, useOnDropToFolder, useSaveChanges} from "@/app/home/hooks";
import {Header} from "@/app/home/components/Header";
import {DndProvider} from "react-dnd";
import {HTML5Backend} from "react-dnd-html5-backend";
import {HotkeysProvider} from "react-hotkeys-hook";
import {SettingView} from "@/app/home/components/Setting/SettingView";


function HomeInternal() {
  // State
  const selectedFolder = useNote(state => state.selectedFolder);
  const setSelectedFolder = useNote(state => state.setSelectedFolder);

  // Data
  const {data: folders, error, isLoading} = useFoldersAll();

  // 初回のみ、最初のフォルダを選択する。
  useEffect(() => {
    if (selectedFolder == null && folders != null && folders.folders.length > 0) {
      setSelectedFolder(folders.folders[0] as any);
    }
  }, [folders, selectedFolder, setSelectedFolder]);
  console.log("prerender HomeInternal");

  // 読み込み中なら何もしない。
  if (error) return <div className="h-full w-screen bg-gray-700 text-white">failed to load</div>
  if (isLoading) return <div className="h-full w-screen bg-gray-700 text-white">loading...</div>
  if (folders == null) return <div className="h-full w-screen bg-gray-700 text-white">folders is null</div>
  console.log("render HomeInternal");

  return (
    <main className='h-full w-screen bg-red-200 flex flex-col relative'>
      <Header />
      <div className="flex flex-grow h-[0%]">
        <div className="flex flex-col md:flex-row">
          <FolderListView />
          <NoteListView />
        </div>
        <HotkeysProvider>
          <NoteEditor />
        </HotkeysProvider>
      </div>

      <SettingView />
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
