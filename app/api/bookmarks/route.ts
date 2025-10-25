import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";
import {cookies} from "next/headers";

const FOLDER_LOCK_SECRET = process.env.FOLDER_LOCK_SECRET ?? null;

export async function GET(req: NextRequest) {
  // ロック解除状態かチェック
  const cookieStore = await cookies();
  const folderKey = cookieStore.get("FOLDER_KEY")?.value;
  const isUnlocked =
    FOLDER_LOCK_SECRET != null &&
    FOLDER_LOCK_SECRET.length > 0 &&
    folderKey === FOLDER_LOCK_SECRET;

  // ブックマークされたノートを、ブックマークした順（id順）で取得
  const bookmarkedNotes = await prisma.note.findMany({
    where: {
      bookmarked: true
    },
    include: {
      folder: true
    },
    orderBy: {
      id: 'asc'
    }
  });

  // ロック解除中なら全て表示
  if (isUnlocked) {
    return NextResponse.json(bookmarkedNotes);
  }

  // ロック中は、ロックされたフォルダーのノートを除外
  // 全フォルダーを取得（親子関係を含む）
  const allFolders = await prisma.folder.findMany({
    select: {
      id: true,
      isLocked: true,
      parentFolderId: true
    }
  });

  // フォルダーIDからロック状態を判定する関数（祖先フォルダーも確認）
  const isLockedRecursive = (folderId: number | null): boolean => {
    if (folderId === null) return false;

    const folder = allFolders.find(f => f.id === folderId);
    if (!folder) return false;
    if (folder.isLocked) return true;

    // 親フォルダーも確認
    return isLockedRecursive(folder.parentFolderId);
  };

  // ロックされたフォルダー（およびその子孫フォルダー）のノートを除外
  const filteredNotes = bookmarkedNotes.filter(note =>
    !isLockedRecursive(note.folderId)
  );

  return NextResponse.json(filteredNotes);
}
