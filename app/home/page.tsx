"use client";

import Image from 'next/image'
import React from "react";
import useSWR from "swr";
import {format} from 'date-fns';
import SideBar from "@/app/home/SideBar";
import NoteEditor from "@/app/home/NoteEditor";
import NoteListView from "@/app/home/NoteListView";


function fetcher(url: string) {
  return fetch(url).then(res => res.json())
}

function useStacks() {
  return useSWR('/api/notebooks', fetcher);
}

function useNotes(stack: string, notebook: string) {
  return useSWR(`/api/notebooks/${stack}/${notebook}`, fetcher);
}

export default function Home() {
  const {data: stacks, error, isLoading} = useStacks();
  const [selectedNotebook, setSelectedNotebook] = React.useState(null);
  const {data: notes} = useNotes(selectedNotebook?.stackName, selectedNotebook?.name);
  const [selectedNote, setSelectedNote] = React.useState(null);

  if (error) return <div>failed to load</div>
  if (isLoading) return <div>loading...</div>

  return (
    <main className='flex h-screen w-screen bg-red-200'>
      <SideBar stacks={stacks}
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
