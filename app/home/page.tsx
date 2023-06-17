"use client";

import Image from 'next/image'
import React from "react";
import useSWR from "swr";
import {format} from 'date-fns';
import SideBar from "@/app/home/SideBar";
import NoteEditor from "@/app/home/NoteEditor";
import NoteListView from "@/app/home/NoteListView";
import {Folder, Note} from "@prisma/client";


function fetcher(url: string) {
  return fetch(url).then(res => res.json())
}

function useFoldersAll() {
  return useSWR<Folder[]>('/api/rpc/getFoldersAll', fetcher);
}

function useNotes(folderId: number | undefined) {
  return useSWR<Folder>(`/api/rest/folders/${folderId}`, fetcher);
}

export default function Home() {
  const {data: folders, error, isLoading} = useFoldersAll();
  const [selectedNotebook, setSelectedNotebook] = React.useState<Folder | null>(null);
  const {data: notesParent} = useNotes(selectedNotebook?.id);
  const [selectedNote, setSelectedNote] = React.useState<Note | null>(null);

  if (error) return <div>failed to load</div>
  if (isLoading) return <div>loading...</div>
  if (folders == null) return <div>folders is null</div>

  const notes = notesParent?.notes ?? [];
  notes.forEach((n: Note) => {
    n.updatedAt = new Date(n.updatedAt as any);
    n.createdAt = new Date(n.createdAt as any);
  });


  console.log("draw page");
  return (
    <main className='flex h-screen w-screen bg-red-200'>
      <SideBar folders={folders}
               selectedNotebook={selectedNotebook}
               setSelectedNotebook={setSelectedNotebook}
      />

      <NoteListView notes={notes}
                    selectedNote={selectedNote}
                    setSelectedNote={setSelectedNote}
      />

      <NoteEditor note={selectedNote}/>
    </main>
  )
}
