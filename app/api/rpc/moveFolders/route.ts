import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";

export async function POST(
  req: NextRequest,
) {
  const {parentFolderId, folderIds}: { parentFolderId: number, folderIds: number[] } =
    await req.json();
  const res = await prisma.folder.update({
    data: {
      childFolders: {
        connect: folderIds.map(id => ({id})),
      }
    },
    where: {id: parentFolderId},
  });
  return NextResponse.json(res);
}
