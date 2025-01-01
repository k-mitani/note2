import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";
import {cookies} from "next/headers";

const FOLDER_LOCK_SECRET = process.env.FOLDER_LOCK_SECRET ?? null;

export async function PUT(
  req: NextRequest,
  {params}: { params: { folderId: string } }
) {
  const folderId = parseInt(params.folderId);
  if (isNaN(folderId)) {
    return NextResponse.json(null);
  }
  const {shouldLock} = await req.json();

  // ロック解除の場合はキーが必要
  if (!shouldLock) {
    const cookieStore = cookies();
    const folderKey = cookieStore.get("FOLDER_KEY")?.value;
    const cannotLock =
      FOLDER_LOCK_SECRET == null ||
      FOLDER_LOCK_SECRET.length === 0 ||
      folderKey !== FOLDER_LOCK_SECRET;
    if (cannotLock) {
      return NextResponse.error();
    }
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
