import {mutate} from "swr";
import * as utils from "@/app/utils";

export async function createFolder(parentFolderId: number | null) {
  const newName = prompt("名前を入力してください", "新しいフォルダー");
  if (newName == null) return;
  await utils.postJson(`/api/folders/${parentFolderId}/createFolder`, {name: newName});
  await mutate('/api/rpc/getFoldersAll');
}
