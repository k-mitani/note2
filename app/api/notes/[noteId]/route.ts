import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";
import {isFolderLockUnlocked} from "@/lib/folderLock";

// パーマリンク（?note=<id>）からの復元用に、単一ノートを取得する。
// 所属フォルダーを知るために folderId を含むノート全体を返す。
export async function GET(req: NextRequest, props: { params: Promise<{ noteId: string }> }) {
  const params = await props.params;
  const noteId = parseInt(params.noteId);
  if (isNaN(noteId)) {
    return NextResponse.json(null);
  }

  const note = await prisma.note.findUnique({
    where: {id: noteId},
    include: {folder: true},
  });
  if (note == null) {
    return NextResponse.json(null);
  }

  // ロックフォルダーのノートは、解錠済みでなければ公開しない。
  if (note.folder?.isLocked && !(await isFolderLockUnlocked())) {
    return NextResponse.json(null);
  }

  // folder は判定用に取得しただけなので落とし、Note と同じ形で返す。
  const {folder, ...rest} = note;
  return NextResponse.json(rest);
}
