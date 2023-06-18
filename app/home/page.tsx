"use client";

import React, {useContext} from "react";
import useSWR from "swr";
import SideBar from "@/app/home/SideBar";
import NoteEditor from "@/app/home/NoteEditor";
import NoteListView from "@/app/home/NoteListView";
import {Folder, Note} from "@prisma/client";
import {RecoilRoot, useRecoilState} from "recoil";
import {atoms} from "@/app/home/atoms";

function fetcher(url: string) {
  return fetch(url).then(res => res.json())
}

function useFoldersAll() {
  return useSWR<Folder[]>('/api/rpc/getFoldersAll', fetcher);
}

function useFolderAndNotes(folderId: number | undefined) {
  const swr = useSWR<Folder & { notes: Note[] }>(`/api/folders/${folderId}`, fetcher);
  if (swr.data != null) {
    swr.data.notes.forEach((n: Note) => {
      if (n != null && !(n.updatedAt instanceof Date)) n.updatedAt = new Date(n.updatedAt as any);
      if (!(n.createdAt instanceof Date)) n.createdAt = new Date(n.createdAt as any);
    });
  }
  return swr;
}

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
      <SideBar folders={folders}/>

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
