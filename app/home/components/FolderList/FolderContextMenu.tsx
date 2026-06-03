import {mutate} from "swr";
import {createFolder} from "@/lib/folder";
import type {Folder} from "@/app/generated/prisma/browser";
import * as utils from "@/app/utils";

function MenuItem({name, onClick}: { name: string, onClick: () => void }) {
  return (
    <li
      className="hover:bg-gray-200 dark:hover:bg-gray-500 w-full cursor-pointer"
      onClick={onClick}>
      {name}
    </li>
  );
}

export function FolderContextMenu({folder}: { folder: Folder }) {
  return <div className="bg-white text-black dark:bg-gray-700 dark:text-gray-200">
    <ul className="flex-col p-0.5">
      <MenuItem name="共有先に設定" onClick={async () => {
        await utils.putJson(`/api/settings/ShareTargetFolder`, {folderId: folder.id});
        alert(`「${folder.name}」を共有先に設定しました。`);
      }} />

      <MenuItem name="名前変更" onClick={async () => {
        const newName = prompt("名前を入力してください", folder.name);
        if (newName == null) return;
        await utils.putJson(`/api/folders/${folder.id}/changeName`, {name: newName});
        await mutate('/api/rpc/getFoldersAll');
      }} />

      {folder.isLocked && <MenuItem name="ロック解除" onClick={async () => {
        const yes = confirm("ロックを解除します。よろしいですか？");
        if (!yes) return;
        await utils.putJson(`/api/folders/${folder.id}/setLock`, {shouldLock: false});
        await Promise.all([
          mutate('/api/rpc/getFoldersAll'),
          mutate('/api/bookmarks'),
        ]);
      }} />}
      {!folder.isLocked && <MenuItem name="ロック" onClick={async () => {
        const yes = confirm("フォルダーをロックしますか？");
        if (!yes) return;
        await utils.putJson(`/api/folders/${folder.id}/setLock`, {shouldLock: true});
        await Promise.all([
          mutate('/api/rpc/getFoldersAll'),
          mutate('/api/bookmarks'),
        ]);
      }} />}

      <MenuItem name="フォルダー作成" onClick={() => {
        createFolder(folder.id);
      }} />

      <MenuItem name="削除" onClick={async () => {
        const yes = confirm("本当に削除しますか？");
        if (!yes) return;
        await utils.deleteJson(`/api/folders/${folder.id}`);
        await mutate('/api/rpc/getFoldersAll');
      }} />
    </ul>
  </div>
}
