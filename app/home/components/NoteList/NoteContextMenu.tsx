import {mutate} from "swr";
import type {Note} from "@/app/generated/prisma/browser";
import * as utils from "@/app/utils";
import {PopupMenu, PopupMenuItem, PopupMenuSeparator} from "@/app/home/components/PopupMenu";
import {TRASH_FOLDER_ID} from "@/app/home/constants";
import {useNote} from "@/app/home/state";
import {
  getNoteContentCopyText,
  noteContentToFormattedHtml,
  writeTextToClipboard,
} from "@/lib/noteContentCopy";

export function NoteContextMenu(
  {note, changedContent, needsLoadFullContent, x, y, onClose}: {
    note: Note,
    changedContent: string | undefined,
    needsLoadFullContent: boolean,
    x: number,
    y: number,
    onClose: () => void,
  }) {
  const selectedNote = useNote(state => state.selectedNote);
  const setSelectedNote = useNote(state => state.setSelectedNote);

  // 項目実行時はメニューを閉じてから処理する。
  const run = (action: () => Promise<void> | void) => async () => {
    onClose();
    await action();
  };

  const loadContent = async (): Promise<string> => {
    if (changedContent != null) return changedContent;
    if (!needsLoadFullContent) return note.content;

    const res = await fetch(`/api/notes/${note.id}`);
    if (!res.ok) return note.content;

    const fullNote = await res.json() as Note | null;
    return fullNote?.content ?? note.content;
  };

  const copyContent = (format: "txt" | "md" | "html") => run(async () => {
    const content = await loadContent();
    if (format === "txt") {
      await writeTextToClipboard(getNoteContentCopyText(content, "plain"));
      return;
    }
    if (format === "md") {
      await writeTextToClipboard(getNoteContentCopyText(content, "markdown"));
      return;
    }
    await writeTextToClipboard(noteContentToFormattedHtml(content));
  });

  const moveToTrash = run(async () => {
    await utils.postJson("/api/rpc/moveNotes/", {
      folderId: TRASH_FOLDER_ID,
      noteIds: [note.id],
    });
    if (selectedNote?.id === note.id) {
      setSelectedNote(null);
    }

    const mutations: Promise<unknown>[] = [
      mutate("/api/rpc/getFoldersAll"),
      mutate("/api/bookmarks"),
      mutate(`/api/folders/${TRASH_FOLDER_ID}`),
      mutate(key => typeof key === "string" && key.startsWith("/api/rpc/search")),
    ];
    if (note.folderId != null) {
      mutations.push(mutate(`/api/folders/${note.folderId}`));
    }
    await Promise.all(mutations);
  });

  return (
    <PopupMenu x={x} y={y} onClose={onClose}>
      <PopupMenuItem label="複製" onClick={run(async () => {
        await utils.postJson(`/api/notes/${note.id}/duplicate`);
        await mutate(`/api/folders/${note.folderId}`);
      })} />
      <PopupMenuSeparator />
      <PopupMenuItem label="本文コピー(txt)" onClick={copyContent("txt")} />
      <PopupMenuItem label="本文コピー(md)" onClick={copyContent("md")} />
      <PopupMenuItem label="本文コピー(html)" onClick={copyContent("html")} />
      <PopupMenuSeparator />
      <PopupMenuItem label="削除" danger onClick={moveToTrash} />
    </PopupMenu>
  );
}
