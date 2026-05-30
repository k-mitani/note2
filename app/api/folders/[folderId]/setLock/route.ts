import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";
import {isFolderLockUnlocked} from "@/lib/folderLock";

export async function PUT(req: NextRequest, props: { params: Promise<{ folderId: string }> }) {
  const params = await props.params;
  const folderId = parseInt(params.folderId);
  if (isNaN(folderId)) {
    return NextResponse.json(null);
  }
  const {shouldLock} = await req.json();

  // ロック解除の場合はキーが必要
  if (!shouldLock && !(await isFolderLockUnlocked())) {
    return NextResponse.error();
  }

  const folder = await prisma.folder.update({
    where: {
      id: folderId,
    },
    data: {
      isLocked: shouldLock,
    }
  })
  return NextResponse.json(folder);
}
