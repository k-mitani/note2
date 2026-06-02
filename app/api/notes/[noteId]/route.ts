import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";
import {isFolderRestrictedByLock} from "@/lib/folderLock";

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
  });
  if (note == null) {
    return NextResponse.json(null);
  }

  // ロックフォルダーのノートは、解錠済みでなければ公開しない。
  if (await isFolderRestrictedByLock(note.folderId)) {
    return NextResponse.json(null);
  }

  return NextResponse.json(note);
}
