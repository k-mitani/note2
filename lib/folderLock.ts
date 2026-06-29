import {cookies} from "next/headers";
import {prisma} from "@/lib/prisma";

const FOLDER_LOCK_SECRET = process.env.FOLDER_LOCK_SECRET ?? null;

type FolderLockRecord = {
  id: number,
  parentFolderId: number | null,
  isLocked: boolean,
};

/** ロックフォルダーを閲覧可能な状態（=正しいキーを保持）ならtrue。 */
export async function isFolderLockUnlocked(): Promise<boolean> {
  if (FOLDER_LOCK_SECRET == null || FOLDER_LOCK_SECRET.length === 0) return false;
  const cookieStore = await cookies();
  const folderKey = cookieStore.get("FOLDER_KEY")?.value;
  return folderKey === FOLDER_LOCK_SECRET;
}

export function isFolderRestrictedByMap(
  folderId: number | null | undefined,
  folderById: Map<number, FolderLockRecord>
): boolean {
  const visited = new Set<number>();

  let currentId: number | null | undefined = folderId;
  while (currentId != null && !visited.has(currentId)) {
    visited.add(currentId);
    const folder = folderById.get(currentId);
    if (folder == null) return false;
    if (folder.isLocked) return true;
    currentId = folder.parentFolderId;
  }

  return false;
}

export async function filterVisibleByFolderLock<T extends { folderId?: number | null }>(items: T[]): Promise<T[]> {
  if (await isFolderLockUnlocked()) return items;

  const folders = await prisma.folder.findMany({
    select: {
      id: true,
      parentFolderId: true,
      isLocked: true,
    },
  });
  const folderById = new Map(folders.map(folder => [folder.id, folder]));
  return items.filter(item => !isFolderRestrictedByMap(item.folderId, folderById));
}

/** 指定フォルダーまたは祖先フォルダーがロック対象で、現在未解除ならtrue。 */
export async function isFolderRestrictedByLock(folderId: number | null | undefined): Promise<boolean> {
  if (folderId == null) return false;
  if (await isFolderLockUnlocked()) return false;

  const folders = await prisma.folder.findMany({
    select: {
      id: true,
      parentFolderId: true,
      isLocked: true,
    },
  });
  const folderById = new Map(folders.map(folder => [folder.id, folder]));
  return isFolderRestrictedByMap(folderId, folderById);
}
