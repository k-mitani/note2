"use client";

import React from "react";
import useSWR from "swr";
import SideBar from "@/app/home/SideBar";
import NoteEditor from "@/app/home/NoteEditor";
import NoteListView from "@/app/home/NoteListView";
import {Folder, Note} from "@prisma/client";
import {RecoilRoot, useRecoilState} from "recoil";
import {atoms} from "@/app/home/atoms";
import {useFolderAndNotes, useFoldersAll} from "@/app/home/hooks";


function HomeInternal() {
  // State
  const [selectedFolder, setSelectedFolder] = useRecoilState(atoms.selectedFolder);
  const [selectedNote, setSelectedNote] = useRecoilState(atoms.selectedNote);

  // Data
  const {data: folders, error, isLoading} = useFoldersAll();
  const {data: notesParent} = useFolderAndNotes(selectedFolder?.id);

  // 読み込み中なら何もしない。
  if (error) return <div>failed to load</div>
  if (isLoading) return <div>loading...</div>
  if (folders == null) return <div>folders is null</div>

  const notes = notesParent?.notes ?? [];
  return (
    <main className='flex h-screen w-screen bg-red-200'>
      <SideBar />

      <NoteListView notes={notes}/>

      <NoteEditor/>
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
