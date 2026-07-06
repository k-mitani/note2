import {mutate} from "swr";
import * as utils from "@/app/utils";
import {api} from "@/app/home/remote";

export async function createFolder(parentFolderId: number | null) {
  const newName = prompt("名前を入力してください", "新しいフォルダー");
  if (newName == null) return;
  await utils.postJson(api(`/api/folders/${parentFolderId}/createFolder`), {name: newName});
  await mutate(api('/api/rpc/getFoldersAll'));
}
