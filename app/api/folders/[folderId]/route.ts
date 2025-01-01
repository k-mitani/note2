import {cookies} from 'next/headers'
import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";

const FOLDER_LOCK_SECRET = process.env.FOLDER_LOCK_SECRET ?? null;

export async function DELETE(
  req: NextRequest,
  {params}: { params: { folderId: string } }
) {
  const folder = await prisma.folder.update({
    data: {parentFolderId: -1},
    where: {id: parseInt(params.folderId)},
  })
  return NextResponse.json(folder);
}

export async function GET(
  _req: NextRequest,
  {params}: { params: { folderId: string } }
) {
  const folderId = parseInt(params.folderId);
  if (isNaN(folderId)) {
    return NextResponse.json(null);
  }

  const folder = await prisma.folder.findUnique({
    include: {
      notes: true,
    },
    where: {id: folderId},
  });

  if (folder?.isLocked) {
    const cookieStore = cookies();
    const folderKey = cookieStore.get("FOLDER_KEY")?.value;
    if (FOLDER_LOCK_SECRET == null ||
      FOLDER_LOCK_SECRET.length === 0 ||
      folderKey !== FOLDER_LOCK_SECRET) {
      console.log("Folder is locked " + folderId + " " + folder.name);
      return NextResponse.json(null);
    }
  }

  return NextResponse.json(folder);
}
