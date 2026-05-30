import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";
import {normalizeNoteContent} from "@/lib/normalizeNoteContent";
import {toSummary} from "@/lib/noteSummary";

export async function POST(
  req: NextRequest,
  {params}: { params: any },
) {
  const {notes} = await req.json();
  const normalizedNotes = await Promise.all(notes.map(async (note: any) => {
    const updatedAt = note.updatedAt || new Date();
    const content = await normalizeNoteContent(note.content);
    const data: any = {title: note.title, content, summary: toSummary(content), updatedAt};
    if (note.createdAt) data.createdAt = new Date(note.createdAt);
    return {id: note.id, data};
  }));
  const res = await prisma.$transaction(normalizedNotes.map(({id, data}) => {
    return prisma.note.update({
      data,
      where: {id},
    });
  }));
  return NextResponse.json(res);
}
