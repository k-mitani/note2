import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";

export async function PUT(
  req: NextRequest,
  {params}: { params: { folderId: string } }
) {
  const folderId = parseInt(params.folderId);
  const {name} = await req.json();
  if (isNaN(folderId)) {
    return NextResponse.error();
  }
  const folder = await prisma.folder.update({
    data: {name: name},
    where: {id: folderId},
  });
  return NextResponse.json(folder);
}
