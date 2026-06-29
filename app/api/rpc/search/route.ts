export const dynamic = "force-dynamic";
import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";
import {filterVisibleByFolderLock} from "@/lib/folderLock";

// 全フォルダー横断で title / content を部分一致検索し、ヒットしたノートを軽量版で返す。
// 重い content / resource は読まず、保存済みの summary を content として渡す（一覧表示用）。
// クライアント側でフォルダー別件数やヒットID集合を算出する。
// ロック中は、ロックされたフォルダー（祖先含む）配下のノートを結果から除外する。
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  // 空のときは検索しない（Enterでは1〜2文字でも検索を許可するため最小文字数は設けない）。
  if (q.length === 0) {
    return NextResponse.json({notes: []});
  }

  const notes = await prisma.note.findMany({
    where: {
      OR: [
        {title: {contains: q, mode: "insensitive"}},
        {content: {contains: q, mode: "insensitive"}},
      ],
    },
    omit: {content: true, resource: true},
    orderBy: {updatedAt: "desc"},
  });

  // 軽量版は summary を content として渡す（content 全文は読み込んでいない）。
  for (const note of notes as any[]) {
    note.content = note.summary ?? "";
    delete note.summary;
  }

  const visible = await filterVisibleByFolderLock(notes);

  return NextResponse.json({notes: visible});
}
