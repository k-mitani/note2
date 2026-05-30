export const dynamic = "force-dynamic";
import {prisma} from '@/lib/prisma';
import {NextResponse} from "next/server";
import type {Folder} from "@/app/generated/prisma/client";
import {isFolderLockUnlocked} from "@/lib/folderLock";
import {TRASH_FOLDER_ID} from "@/app/home/constants";

export async function GET() {
  // 全フォルダーを取得する。
  const foldersAll = await prisma.folder.findMany({
    include: {
      _count: {
        select: {
          notes: true,
        }
      }
    }
  });
  // ゴミ箱を取得する。
  let trash = foldersAll.find(f => f.id === TRASH_FOLDER_ID);

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
  let roots = foldersAll.filter(f => f.parentFolderId === null && f !== trash);
  // 全部ソートしていく。
  function sortChildren(folders: any[]) {
    folders.sort((a: any, b: any) => a.name.localeCompare(b.name));
    folders.forEach((f: any) => {
      if (f.childFolders === undefined) return;
      sortChildren(f.childFolders);
    });
  }
  sortChildren(roots);

  // ロック状態ならlockedなフォルダーは除外する。
  const shouldLock = !(await isFolderLockUnlocked());
  if (shouldLock) {
    function removeLockedFolder(folders: any[]) {
      return folders.filter((f: any) => {
        if (f.isLocked) return false;
        if (f.childFolders != null) f.childFolders = removeLockedFolder(f.childFolders);
        return true;
      });
    }
    roots = removeLockedFolder(roots);
    trash = removeLockedFolder([trash])[0];
  }

  return NextResponse.json({
    folders: roots,
    trash: trash,
  });
}
