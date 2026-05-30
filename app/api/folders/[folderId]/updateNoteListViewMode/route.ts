import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";
import {$Enums} from "@prisma/client";

export async function PUT(req: NextRequest, props: { params: Promise<{ folderId: string }> }) {
  const params = await props.params;
  const folderId = parseInt(params.folderId);
  if (isNaN(folderId)) {
    return NextResponse.json(null);
  }

  const {noteListViewMode} = await req.json();
  if (!Object.values($Enums.NoteListViewMode).includes(noteListViewMode)) {
    return NextResponse.json({error: "Invalid note list view mode value"}, {status: 400});
  }

  const folder = await prisma.folder.update({
    where: {id: folderId},
    data: {noteListViewMode},
  });
  return NextResponse.json(folder);
}
