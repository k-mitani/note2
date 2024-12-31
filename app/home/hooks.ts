import useSWR, {mutate} from "swr";
import {Folder, Note} from "@prisma/client";
import {useNote} from "@/app/home/state";
import * as utils from "@/app/utils";
import {useCallback} from "react";

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

function folderUrl(folderId: number | undefined) {
  return `/api/folders/${folderId}`;
}

const emptyNoteList: Note[] = [];
export function useFolderAndNotes(folderId: number | undefined): {notes: Note[], isLoading: boolean} {
  const {data, isLoading} = useSWR<Folder & { notes: Note[] }>(folderUrl(folderId), fetcher);
  if (data != null) {
    data.notes.forEach((n: Note) => {
      if (n != null && !(n.updatedAt instanceof Date)) n.updatedAt = new Date(n.updatedAt as any);
      if (!(n.createdAt instanceof Date)) n.createdAt = new Date(n.createdAt as any);
    });
  }
  return {
    notes: data?.notes ?? emptyNoteList,
    isLoading,
  }
}

export function useSaveChanges(currentFolderId: number | undefined) {
  const changedNotesWrapper = useNote(state => state.changedNotes);
  const [changedNotes] = changedNotesWrapper;
  const clearChangedNotes = useNote(state => state.clearChangedNotes);

  return useCallback(async function saveChanges() {
    console.log("saveChanges", changedNotes);
    await utils.postJson("/api/rpc/saveChanges", {
      notes: Array.from(changedNotes.values()),
    });
    clearChangedNotes()
    await Promise.all([
      mutate(folderUrl(currentFolderId)),
      mutate("/api/rpc/getFoldersAll"),
    ]);
  }, [currentFolderId, changedNotesWrapper, clearChangedNotes]);
}

export function useOnCreateNewNote(currentFolderId: number | undefined) {
  const selectedFolder = useNote(state => state.selectedFolder);
  const setSelectedNote = useNote(state => state.setSelectedNote);

  return useCallback(async function onCreateNewNote() {
    if (selectedFolder == null) return;
    const res = await utils.postJson(
      `/api/folders/${selectedFolder.id}/createNote`
    );
    const newNote = await res.json();
    utils.coerceDate(newNote, "createdAt");
    utils.coerceDate(newNote, "updatedAt");
    console.log(newNote);
    await Promise.all([
      mutate(folderUrl(currentFolderId)),
      mutate("/api/rpc/getFoldersAll"),
    ]);
    setSelectedNote(newNote);
  }, [currentFolderId, selectedFolder, setSelectedNote]);
}

export function useOnDropToFolder(currentFolderId: number | undefined) {
  return useCallback(async function onDropToFolder(
    ev: { target: Folder, notes: Note[] | null, folders: Folder[] | null }
  ) {
    // ノートがドロップされた場合
    if (ev.notes != null) {
      await utils.postJson("/api/rpc/moveNotes/", {
        folderId: ev.target.id,
        noteIds: ev.notes.map(n => n.id),
      });
      mutate(folderUrl(currentFolderId));
      mutate("/api/rpc/getFoldersAll");
    }
    // フォルダーがドロップされた場合
    if (ev.folders != null) {
      await utils.postJson("/api/rpc/moveFolders/", {
          parentFolderId: ev.target.id,
          folderIds: ev.folders.map(n => n.id).filter(id => id !== ev.target.id),
      });
      mutate(folderUrl(currentFolderId));
      mutate("/api/rpc/getFoldersAll");
    }
  }, [currentFolderId]);
}