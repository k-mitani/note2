import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";
import {Prisma} from ".prisma/client";
import JsonNull = Prisma.JsonNull;

export async function POST(req: NextRequest, props: { params: Promise<{ folderId: string }> }) {
  const params = await props.params;
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
