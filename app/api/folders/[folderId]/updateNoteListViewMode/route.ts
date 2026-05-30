import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";

const NOTE_LIST_VIEW_MODES = ["SUMMARY", "TITLE_ONLY"] as const;

export async function PUT(req: NextRequest, props: { params: Promise<{ folderId: string }> }) {
  const params = await props.params;
  const folderId = parseInt(params.folderId);
  if (isNaN(folderId)) {
    return NextResponse.json(null);
  }

  const {noteListViewMode} = await req.json();
  if (!NOTE_LIST_VIEW_MODES.includes(noteListViewMode)) {
    return NextResponse.json({ error: "Invalid note list view mode value" }, { status: 400 });
  }

  await prisma.$executeRaw`
    UPDATE "Folder"
    SET "noteListViewMode" = ${noteListViewMode}::"NoteListViewMode"
    WHERE "id" = ${folderId}
  `;

  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
  });
  return NextResponse.json({...folder, noteListViewMode});
}
