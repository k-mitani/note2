import useSWR, {mutate} from "swr";
import type {Folder, Note} from "@/app/generated/prisma/browser";
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
    // 軽量取得(light)ではcontentを含まないので空文字で補う。
    content: note.content ?? "",
    createdAt: note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt as any),
    updatedAt: note.updatedAt == null
      ? null
      : (note.updatedAt instanceof Date ? note.updatedAt : new Date(note.updatedAt as any)),
  };
}

const emptyNoteList: Note[] = [];

// 同じfetch結果(data)に対しては同じ正規化済み配列を返すことで、
// リストとエディターなど複数のコンポーネント間で note のオブジェクト同一性を一致させる。
// selectedNote === note の比較（選択ハイライト等）が安定して動くために重要。
const normalizedNotesCache = new WeakMap<object, Note[]>();
function getNormalizedNotes(data: (Folder & { notes: Note[] }) | undefined): Note[] {
  if (data == null) return emptyNoteList;
  let cached = normalizedNotesCache.get(data);
  if (cached == null) {
    cached = data.notes.map(normalizeNoteDates);
    normalizedNotesCache.set(data, cached);
  }
  return cached;
}

/**
 * フォルダー内のノート一覧を二段階で取得する。
 * - まず content を含まない軽量版(?light=1)を取得して一覧を素早く描画する。
 * - 並行してフル版（content/resource込み）を取得し、揃ったら全体を差し替える。
 *
 * 返り値:
 * - notes: フル版があればフル版、無ければ軽量版を正規化したもの。
 * - isLoading: 軽量版すら未取得（一覧を出せない）状態。
 * - isFullLoaded: フル版が取得済みで content が利用可能な状態。
 *   （本文の編集や検索はフル版が揃ってから有効にする。）
 */
export function useFolderAndNotes(folderId: number | undefined): {
  notes: Note[], isLoading: boolean, isFullLoaded: boolean,
} {
  const lightKey = folderId != null ? `${folderUrl(folderId)}?light=1` : null;
  const fullKey = folderId != null ? folderUrl(folderId) : null;

  const {data: lightData} = useSWR<Folder & { notes: Note[] }>(lightKey, utils.jsonFetcher);
  const {data: fullData} = useSWR<Folder & { notes: Note[] }>(fullKey, utils.jsonFetcher);

  const data = fullData ?? lightData;
  const notes = useMemo(() => getNormalizedNotes(data), [data]);

  return {
    notes,
    isLoading: folderId != null && data == null,
    isFullLoaded: fullData != null,
  };
}

export function useSaveChanges(currentFolderId: number | undefined) {
  const changedNotes = useNote(state => state.changedNotes);
  const removeSavedNotes = useNote(state => state.removeSavedNotes);

  return useCallback(async function saveChanges() {
    const saved = Array.from(changedNotes.values());
    if (saved.length === 0) return;
    console.log("saveChanges", changedNotes);
    const res = await utils.postJson("/api/rpc/saveChanges", {notes: saved});
    // 保存に失敗した場合は変更を保持し、再取得もしない（次回保存で再送する）。
    if (!res.ok) {
      console.error("saveChanges failed", res.status);
      return;
    }
    // 全消しではなく送信した分だけ消す。保存中に追加された編集を保持するため。
    removeSavedNotes(saved);
    await Promise.all([
      mutate(folderUrl(currentFolderId)),
      mutate("/api/rpc/getFoldersAll"),
    ]);
  }, [currentFolderId, changedNotes, removeSavedNotes]);
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
