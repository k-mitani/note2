import {cookies} from "next/headers";

const FOLDER_LOCK_SECRET = process.env.FOLDER_LOCK_SECRET ?? null;

/** ロックフォルダーを閲覧可能な状態（=正しいキーを保持）ならtrue。 */
export async function isFolderLockUnlocked(): Promise<boolean> {
  if (FOLDER_LOCK_SECRET == null || FOLDER_LOCK_SECRET.length === 0) return false;
  const cookieStore = await cookies();
  const folderKey = cookieStore.get("FOLDER_KEY")?.value;
  return folderKey === FOLDER_LOCK_SECRET;
}
