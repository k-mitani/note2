import notem from '@/lib/note-manager'
import {NextRequest, NextResponse} from "next/server";

export async function GET(
  _req: NextRequest,
  {params}: { params: { stack: string, notebook: string } }
) {
  const notes = notem.getNotes(params.stack, params.notebook);
  return NextResponse.json(notes);
}
