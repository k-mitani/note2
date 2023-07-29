import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";

export async function POST(
  req: NextRequest,
) {
  const {folderId, noteIds}: { folderId: number, noteIds: number[] } =
    await req.json();

  // フォルダー移動ではノートの更新日時を変更したくないので、
  // 変更対象のノートの更新日時を取得しておき、ノート更新時にセットする。
  const notes = await prisma.note.findMany({
    select: {
      id: true,
      updatedAt: true,
    },
    where: {
      id: {
        in: noteIds,
      }
    }
  });

  const res = await prisma.$transaction(notes.map((note: any) => {
    return prisma.note.update({
      data: {
        folderId,
        updatedAt: note.updatedAt,
      },
      where: {id: note.id},
    });
  }));

  return NextResponse.json(res);
}
