import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ noteId: string }> }
) {
  const params = await props.params;
  const noteId = parseInt(params.noteId);

  if (isNaN(noteId)) {
    return NextResponse.json({ error: 'Invalid note ID' }, { status: 400 });
  }

  // 現在のブックマーク状態と更新日時を取得
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: { bookmarked: true, updatedAt: true }
  });

  if (!note) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  }

  // ブックマーク状態を反転（更新日時は変更しない）
  const updatedNote = await prisma.note.update({
    where: { id: noteId },
    data: {
      bookmarked: !note.bookmarked,
      updatedAt: note.updatedAt // 現在の値を保持
    }
  });

  return NextResponse.json(updatedNote);
}
