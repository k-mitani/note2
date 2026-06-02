import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";
import {isFolderRestrictedByLock} from "@/lib/folderLock";
import {TRASH_FOLDER_ID} from "@/app/home/constants";

export async function DELETE(req: NextRequest, props: { params: Promise<{ folderId: string }> }) {
  const params = await props.params;
  const folder = await prisma.folder.update({
    data: {parentFolderId: TRASH_FOLDER_ID},
    where: {id: parseInt(params.folderId)},
  })
  return NextResponse.json(folder);
}

export async function GET(req: NextRequest, props: { params: Promise<{ folderId: string }> }) {
  const params = await props.params;
  const folderId = parseInt(params.folderId);
  if (isNaN(folderId)) {
    return NextResponse.json(null);
  }

  // ?light=1 のときは軽量なノート一覧を返す。重い content と resource は読まず、
  // 保存時に計算済みの summary 列だけを取得する（フル版の全文は別途取得する）。
  // クライアントは一覧を素早く描画するためにまず軽量版を取得し、その後フル版を取得する。
  const light = req.nextUrl.searchParams.get("light") === "1";

  const folder = await prisma.folder.findUnique({
    include: {
      notes: light ? {omit: {content: true, resource: true}} : true,
    },
    where: {id: folderId},
  });

  // 軽量版は、クライアントが content から表示するサマリに合わせて
  // summary を content として渡す（content 全文は読み込んでいない）。
  if (light && folder != null) {
    for (const note of folder.notes as any[]) {
      note.content = note.summary ?? "";
      delete note.summary;
    }
  }

  if (folder != null && await isFolderRestrictedByLock(folder.id)) {
    console.log("Folder is locked " + folderId + " " + folder.name);
    return NextResponse.json(null);
  }

  return NextResponse.json(folder);
}
