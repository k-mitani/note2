import {NextRequest, NextResponse} from "next/server";

// アーカイブ閲覧ページへのリダイレクト。
// カードには note2 内のパス (/archive/{id}) を埋め込み、
// 閲覧ページの実際の場所は ARCHIVE_PUBLIC_URL の設定だけで差し替えられるようにする。
const ARCHIVE_PUBLIC_URL = process.env.ARCHIVE_PUBLIC_URL;

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!ARCHIVE_PUBLIC_URL || !/^\d+$/.test(params.id)) {
    return new NextResponse("not found", {status: 404});
  }
  return NextResponse.redirect(new URL(`/snapshots/${params.id}`, ARCHIVE_PUBLIC_URL));
}
