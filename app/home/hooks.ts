import useSWR, {mutate} from "swr";
import {Folder, Note} from "@prisma/client";
import {useNote} from "@/app/home/state";
import * as utils from "@/app/utils";
import {useCallback, useMemo} from "react";

type FolderAndChild = Folder & { childFolders: FolderAndChild[] };

export function useFoldersAll() {
  return useSWR<{
    folders: FolderAndChild[],
    trash: FolderAndChild
  }>('/api/rpc/getFoldersAll', utils.jsonFetcher);
}

function folderUrl(folderId: number | undefined) {
  return `/api/folders/${folderId}`;
}

/** SWRから取得したnoteは日付が文字列なので、Dateに正規化する。 */
function normalizeNoteDates(note: Note): Note {
  return {
    ...note,
    createdAt: note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt as any),
    updatedAt: note.updatedAt == null
      ? null
      : (note.updatedAt instanceof Date ? note.updatedAt : new Date(note.updatedAt as any)),
  };
}

const emptyNoteList: Note[] = [];
export function useFolderAndNotes(folderId: number | undefined): {notes: Note[], isLoading: boolean} {
  const {data, isLoading} = useSWR<Folder & { notes: Note[] }>(folderUrl(folderId), utils.jsonFetcher);
  const notes = useMemo(() => {
    if (data == null) return emptyNoteList;
    return data.notes.map(normalizeNoteDates);
  }, [data]);
  return {notes, isLoading};
}

export function useSaveChanges(currentFolderId: number | undefined) {
  const changedNotes = useNote(state => state.changedNotes);
  const clearChangedNotes = useNote(state => state.clearChangedNotes);

  return useCallback(async function saveChanges() {
    console.log("saveChanges", changedNotes);
    await utils.postJson("/api/rpc/saveChanges", {
      notes: Array.from(changedNotes.values()),
    });
    clearChangedNotes();
    await Promise.all([
      mutate(folderUrl(currentFolderId)),
      mutate("/api/rpc/getFoldersAll"),
    ]);
  }, [currentFolderId, changedNotes, clearChangedNotes]);
}

export function useOnCreateNewNote(currentFolderId: number | undefined) {
  const selectedFolder = useNote(state => state.selectedFolder);
  const setSelectedNote = useNote(state => state.setSelectedNote);

  return useCallback(async function onCreateNewNote() {
    if (selectedFolder == null) return;
    const res = await utils.postJson(
      `/api/folders/${selectedFolder.id}/createNote`
    );
    const newNote = normalizeNoteDates(await res.json());
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
