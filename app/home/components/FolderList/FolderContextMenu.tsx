import {mutate} from "swr";
import {createFolder} from "@/app/home/components/FolderList/Folder";
import {Folder} from "@prisma/client";
import * as utils from "@/app/utils";

function MenuItem(name: string, onClick: () => void) {
  return (
    <li key={name}
        className="hover:bg-gray-200 dark:hover:bg-gray-500 w-full cursor-pointer"
        onClick={onClick}>
      {name}
    </li>
  );
}

export function FolderContextMenu(folder: Folder) {
  return <div className="bg-white text-black dark:bg-gray-700 dark:text-gray-200">
    <ul className="flex-col p-0.5">
      {MenuItem("共有先に設定", async () => {
        await utils.putJson(`/api/settings/ShareTargetFolder`, {folderId: folder.id});
      })}

      {MenuItem("名前変更", async () => {
        const newName = prompt("名前を入力してください", folder.name)
        if (newName == null) return;
        await utils.putJson(`/api/folders/${folder.id}/changeName`, {name: newName});
        await mutate('/api/rpc/getFoldersAll');
      })}

      {folder.isLocked && MenuItem("ロック解除", async () => {
        await utils.putJson(`/api/folders/${folder.id}/setLock`, {shouldLock: false});
        await mutate('/api/rpc/getFoldersAll');
      })}
      {!folder.isLocked && MenuItem("ロック", async () => {
        await utils.putJson(`/api/folders/${folder.id}/setLock`, {shouldLock: true});
        await mutate('/api/rpc/getFoldersAll');
      })}

      {MenuItem("ショートカットへ追加/削除", async () => {
        await utils.postJson(`/api/rpc/toggleShortcut/${folder.id}`);
      })}

      {MenuItem("フォルダー作成", () => {
        createFolder(folder.id);
      })}

      {MenuItem("削除", async () => {
        const yes = confirm("本当に削除しますか？");
        if (!yes) return;
        await utils.deleteJson(`/api/folders/${folder.id}`);
        await mutate('/api/rpc/getFoldersAll');
      })}
    </ul>
  </div>
}