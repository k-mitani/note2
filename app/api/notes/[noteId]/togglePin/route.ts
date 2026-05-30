import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ noteId: string }> }
) {
  const params = await props.params;
  const noteId = parseInt(params.noteId);

  if (isNaN(noteId)) {
    return NextResponse.json({ error: 'Invalid note ID' }, { status: 400 });
  }

  const notes = await prisma.$queryRaw<{ pinned: boolean, updatedAt: Date | null }[]>`
    SELECT "pinned", "updatedAt"
    FROM "Note"
    WHERE "id" = ${noteId}
    LIMIT 1
  `;
  const note = notes[0];

  if (!note) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  }

  const pinned = !note.pinned;
  await prisma.$executeRaw`
    UPDATE "Note"
    SET "pinned" = ${pinned}, "updatedAt" = ${note.updatedAt}
    WHERE "id" = ${noteId}
  `;

  return NextResponse.json({ id: noteId, pinned });
}
