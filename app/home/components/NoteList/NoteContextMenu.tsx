import {mutate} from "swr";
import type {Note} from "@/app/generated/prisma/browser";
import * as utils from "@/app/utils";
import {PopupMenu, PopupMenuItem} from "@/app/home/components/PopupMenu";

export function NoteContextMenu(
  {note, x, y, onClose}: {
    note: Note,
    x: number,
    y: number,
    onClose: () => void,
  }) {
  // 項目実行時はメニューを閉じてから処理する。
  const run = (action: () => Promise<void> | void) => async () => {
    onClose();
    await action();
  };

  return (
    <PopupMenu x={x} y={y} onClose={onClose}>
      <PopupMenuItem label="複製" onClick={run(async () => {
        await utils.postJson(`/api/notes/${note.id}/duplicate`);
        await mutate(`/api/folders/${note.folderId}`);
      })} />
    </PopupMenu>
  );
}
