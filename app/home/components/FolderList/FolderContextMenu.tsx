import {mutate} from "swr";
import {createFolder} from "@/lib/folder";
import type {Folder} from "@/app/generated/prisma/browser";
import * as utils from "@/app/utils";
import {PopupMenu, PopupMenuItem} from "@/app/home/components/PopupMenu";

export function FolderContextMenu(
  {folder, x, y, onClose}: {
    folder: Folder,
    x: number,
    y: number,
    onClose: () => void,
  }) {
  const run = (action: () => Promise<void> | void) => async () => {
    onClose();
    await action();
  };

  return <PopupMenu x={x} y={y} onClose={onClose}>
      <PopupMenuItem label="共有先に設定" onClick={run(async () => {
        await utils.putJson(`/api/settings/ShareTargetFolder`, {folderId: folder.id});
        alert(`「${folder.name}」を共有先に設定しました。`);
      })} />

      <PopupMenuItem label="名前変更" onClick={run(async () => {
        const newName = prompt("名前を入力してください", folder.name);
        if (newName == null) return;
        await utils.putJson(`/api/folders/${folder.id}/changeName`, {name: newName});
        await mutate('/api/rpc/getFoldersAll');
      })} />

      {folder.isLocked && <PopupMenuItem label="ロック解除" onClick={run(async () => {
        const yes = confirm("ロックを解除します。よろしいですか？");
        if (!yes) return;
        await utils.putJson(`/api/folders/${folder.id}/setLock`, {shouldLock: false});
        await Promise.all([
          mutate('/api/rpc/getFoldersAll'),
          mutate('/api/bookmarks'),
        ]);
      })} />}
      {!folder.isLocked && <PopupMenuItem label="ロック" onClick={run(async () => {
        const yes = confirm("フォルダーをロックしますか？");
        if (!yes) return;
        await utils.putJson(`/api/folders/${folder.id}/setLock`, {shouldLock: true});
        await Promise.all([
          mutate('/api/rpc/getFoldersAll'),
          mutate('/api/bookmarks'),
        ]);
      })} />}

      <PopupMenuItem label="フォルダー作成" onClick={run(() => {
        createFolder(folder.id);
      })} />

      <PopupMenuItem label="削除" danger onClick={run(async () => {
        const yes = confirm("本当に削除しますか？");
        if (!yes) return;
        await utils.deleteJson(`/api/folders/${folder.id}`);
        await mutate('/api/rpc/getFoldersAll');
      })} />
  </PopupMenu>
}
