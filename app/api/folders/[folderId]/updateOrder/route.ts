import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";
import {$Enums, Prisma} from ".prisma/client";
import NotesOrder = $Enums.NotesOrder;

export async function PUT(
  req: NextRequest,
  {params}: { params: { folderId: string } }
) {
  const folderId = parseInt(params.folderId);
  if (isNaN(folderId)) {
    return NextResponse.json(null);
  }
  const {order} = await req.json();
  if (!Object.values(NotesOrder).includes(order)) {
    return NextResponse.json({ error: "Invalid order value" }, { status: 400 });
  }

  const note = await prisma.folder.update({
    where: {
      id: folderId,
    },
    data: {
      order: order,
    }
  })
  return NextResponse.json(note);
}
