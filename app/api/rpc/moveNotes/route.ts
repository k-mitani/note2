import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";

export async function POST(
  req: NextRequest,
) {
  const {folderId, noteIds}: { folderId: number, noteIds: number[] } =
    await req.json();
  const res = await prisma.folder.update({
    data: {
      notes: {
        connect: noteIds.map(id => ({id})),
      }
    },
    where: {id: folderId},
  });
  return NextResponse.json(res);
}
