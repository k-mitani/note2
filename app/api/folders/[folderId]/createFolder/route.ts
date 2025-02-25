import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";

export async function POST(req: NextRequest, props: { params: Promise<{ folderId: string }> }) {
  const params = await props.params;
  const folderId = params.folderId === "null" ?
    null :
    parseInt(params.folderId);
  const {name} = await req.json();
  if (isNaN(folderId ?? 0)) {
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
