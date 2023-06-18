import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";

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
  })
  return NextResponse.json(folder);
}
