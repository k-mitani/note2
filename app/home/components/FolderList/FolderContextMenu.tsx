import {mutate} from "swr";
import {createFolder} from "@/app/home/components/FolderList/Folder";
import {Folder} from "@prisma/client";

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
        await fetch(`/api/settings/ShareTargetFolder`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({folderId: folder.id}),
        });
      })}

      {MenuItem("名前変更", async () => {
        const newName = prompt("名前を入力してください", folder.name)
        if (newName == null) return;
        await fetch(`/api/rpc/changeFolderName/${folder.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          } as any,
          body: JSON.stringify({name: newName}),
        });
        await mutate('/api/rpc/getFoldersAll');
      })}

      {MenuItem("ショートカットへ追加/削除", async () => {
        await fetch(`/api/rpc/toggleShortcut/${folder.id}`, {
          method: "POST",
        });
      })}

      {MenuItem("フォルダー作成", () => {
        createFolder(folder.id);
      })}

      {MenuItem("削除", async () => {
        const yes = confirm("本当に削除しますか？");
        if (!yes) return;
        await fetch(`/api/folders/${folder.id}`, {
          method: "DELETE",
        });
        await mutate('/api/rpc/getFoldersAll');
      })}
    </ul>
  </div>
}