import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";

export async function POST(
  req: NextRequest,
  {params}: { params: { folderId: string } }
) {
  const folderId = parseInt(params.folderId);
  const {name} = await req.json();
  if (isNaN(folderId)) {
    return NextResponse.error();
  }
  const folder = await prisma.folder.create({
    data: {
      name: name,
      parentFolderId: folderId,
    },
  });
  return NextResponse.json(folder);
}
