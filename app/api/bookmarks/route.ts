import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";
import {isFolderLockUnlocked} from "@/lib/folderLock";

export async function GET(req: NextRequest) {
  const isUnlocked = await isFolderLockUnlocked();

  // ブックマークされたノートを、ブックマークした順（id順）で取得
  const bookmarkedNotes = await prisma.note.findMany({
    where: {bookmarked: true},
    include: {folder: true},
    orderBy: {id: 'asc'},
  });

  // ロック解除中なら全て表示
  if (isUnlocked) {
    return NextResponse.json(bookmarkedNotes);
  }

  // ロック中は、ロックされたフォルダー（およびその祖先がロックされたもの）のノートを除外
  const allFolders = await prisma.folder.findMany({
    select: {
      id: true,
      isLocked: true,
      parentFolderId: true,
    },
  });

  const isLockedRecursive = (folderId: number | null): boolean => {
    if (folderId === null) return false;
    const folder = allFolders.find(f => f.id === folderId);
    if (!folder) return false;
    if (folder.isLocked) return true;
    return isLockedRecursive(folder.parentFolderId);
  };

  const filteredNotes = bookmarkedNotes.filter(note => !isLockedRecursive(note.folderId));
  return NextResponse.json(filteredNotes);
}
