export const dynamic = "force-dynamic";
import {prisma} from '@/lib/prisma';
import {NextResponse} from "next/server";
import {Folder} from "@prisma/client";

export async function GET() {
  // 全フォルダーを取得する。
  const foldersAll = await prisma.folder.findMany();
  // ゴミ箱を取得する。
  const trash = foldersAll.find(f => f.id === -1);

  // 平坦な配列から木構造に直す。
  // まず辞書に直す。
  const folderDict = new Map<number, Folder>();
  foldersAll.forEach(f => folderDict.set(f.id, f));
  // 次に親をセットしていく。
  foldersAll.forEach(f => {
    if (f.parentFolderId === null) return;
    const parent: any = folderDict.get(f.parentFolderId);
    if (parent === undefined) return;
    if (parent.childFolders === undefined) parent.childFolders = [];
    parent.childFolders.push(f);
  });
  // ルートのみの配列を作る。
  const roots = foldersAll.filter(f => f.parentFolderId === null && f !== trash);

  return NextResponse.json({
    folders: roots,
    trash: trash,
  });
}
