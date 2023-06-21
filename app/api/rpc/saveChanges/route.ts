import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";

export async function POST(
  req: NextRequest,
  {params}: { params: any },
) {
  const {notes} = await req.json();
  const res = await prisma.$transaction(notes.map((note: any) => {
    return prisma.note.update({
      data: {title: note.title, content: note.content},
      where: {id: note.id},
    });
  }));
  return NextResponse.json(res);
}
