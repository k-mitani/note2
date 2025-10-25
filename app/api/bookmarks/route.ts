import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";

export async function GET(req: NextRequest) {
  // ブックマークされたノートを、ブックマークした順（id順）で取得
  // ロックされたフォルダーのノートは除外
  const bookmarkedNotes = await prisma.note.findMany({
    where: {
      bookmarked: true,
      folder: {
        isLocked: false
      }
    },
    include: {
      folder: true
    },
    orderBy: {
      id: 'asc'
    }
  });

  return NextResponse.json(bookmarkedNotes);
}
