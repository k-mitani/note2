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

  // 複製元のノートを取得する。
  const source = await prisma.note.findUnique({
    where: {id: noteId},
  });

  if (!source) {
    return NextResponse.json({error: 'Note not found'}, {status: 404});
  }

  // id・作成日時・更新日時を除いた内容をコピーして新しいノートを作成する。
  const duplicated = await prisma.note.create({
    data: {
      folderId: source.folderId,
      title: `${source.title} のコピー`,
      content: source.content,
      summary: source.summary,
      tags: Array.isArray(source.tags) ? source.tags : [],
      resource: source.resource ?? undefined,
      attributes: source.attributes ?? undefined,
      bookmarked: source.bookmarked,
      pinned: source.pinned,
    },
  });

  return NextResponse.json(duplicated);
}
