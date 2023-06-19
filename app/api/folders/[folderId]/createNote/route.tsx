import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";
import {Prisma} from ".prisma/client";
import JsonNull = Prisma.JsonNull;

export async function POST(
  req: NextRequest,
  {params}: { params: { folderId: string } }
) {
  const folderId = parseInt(params.folderId);
  if (isNaN(folderId)) {
    return NextResponse.json(null);
  }
  const note = await prisma.note.create({
    data: {
      folderId: folderId,
      title: "無題のノート",
      content: "",
      tags: [],
      attributes: [],
      resource: JsonNull,
    }
  })
  return NextResponse.json(note);
}
