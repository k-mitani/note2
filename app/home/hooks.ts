import useSWR, {mutate} from "swr";
import {Folder, Note} from "@prisma/client";
import {useNote} from "@/app/home/state";
import * as utils from "@/app/utils";

type FolderAndChild = Folder & { childFolders: FolderAndChild[] };

function fetcher(url: string) {
  return fetch(url).then(res => res.json())
}

export function useFoldersAll() {
  return useSWR<{
    folders: FolderAndChild[],
    trash: FolderAndChild
  }>('/api/rpc/getFoldersAll', fetcher);
}

export function useFolderAndNotes(folderId: number | undefined) {
  const swr = useSWR<Folder & { notes: Note[] }>(`/api/folders/${folderId}`, fetcher);
  if (swr.data != null) {
    swr.data.notes.forEach((n: Note) => {
      if (n != null && !(n.updatedAt instanceof Date)) n.updatedAt = new Date(n.updatedAt as any);
      if (!(n.createdAt instanceof Date)) n.createdAt = new Date(n.createdAt as any);
    });
  }
  return swr;
}

export function useSaveChanges(mutateNotesParent: () => Promise<void>) {
  const [changedNotes] = useNote(state => state.changedNotes);
  const clearChangedNotes = useNote(state => state.clearChangedNotes);

  return async function saveChanges() {
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
}

export function useOnCreateNewNote(mutateNotesParent: () => Promise<void>) {
  const selectedFolder = useNote(state => state.selectedFolder);
  const setSelectedNote = useNote(state => state.setSelectedNote);

  return async function onCreateNewNote() {
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
}

export function useOnDropToFolder(mutateNotesParent: () => Promise<void>) {
  return async function onDropToFolder(
    ev: { target: Folder, notes: Note[] | null, folders: Folder[] | null }
  ) {
    // ノートがドロップされた場合
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
    // フォルダーがドロップされた場合
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
}