import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ noteId: string }> }
) {
  const params = await props.params;
  const noteId = parseInt(params.noteId);

  if (isNaN(noteId)) {
    return NextResponse.json({error: 'Invalid note ID'}, {status: 400});
  }

  // 現在のピン状態と更新日時を取得（更新日時は変更したくないので保持する）
  const note = await prisma.note.findUnique({
    where: {id: noteId},
    select: {pinned: true, updatedAt: true},
  });

  if (!note) {
    return NextResponse.json({error: 'Note not found'}, {status: 404});
  }

  const updated = await prisma.note.update({
    where: {id: noteId},
    data: {
      pinned: !note.pinned,
      updatedAt: note.updatedAt,
    },
  });

  return NextResponse.json(updated);
}
