import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";
import {isFolderLockUnlocked} from "@/lib/folderLock";
import {TRASH_FOLDER_ID} from "@/app/home/constants";

export async function DELETE(req: NextRequest, props: { params: Promise<{ folderId: string }> }) {
  const params = await props.params;
  const folder = await prisma.folder.update({
    data: {parentFolderId: TRASH_FOLDER_ID},
    where: {id: parseInt(params.folderId)},
  })
  return NextResponse.json(folder);
}

export async function GET(_req: NextRequest, props: { params: Promise<{ folderId: string }> }) {
  const params = await props.params;
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

  if (folder?.isLocked && !(await isFolderLockUnlocked())) {
    console.log("Folder is locked " + folderId + " " + folder.name);
    return NextResponse.json(null);
  }

  return NextResponse.json(folder);
}
