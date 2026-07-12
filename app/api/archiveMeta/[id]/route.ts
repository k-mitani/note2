import {NextRequest, NextResponse} from "next/server";
import {archiveApiFetch} from "@/lib/archive";

// アーカイブ済みページのメタデータ (title / site / desc) を返す中継 API。
// OGP 取得に失敗したカード (bot 対策の 403 等) が、link-card 要素の
// 自己修復でアーカイブ側の情報に置き換えるために使う。
// 未取得 (アーカイブ処理中) のときは {ready: false} を返す。
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!/^\d+$/.test(params.id)) {
    return NextResponse.json(null, {status: 404});
  }
  try {
    const res = await archiveApiFetch(`/api/snapshots/${params.id}/metadata`);
    if (res == null || !res.ok) return NextResponse.json(null, {status: 404});
    const data = await res.json();
    if (data?.ready !== true) return NextResponse.json({ready: false});
    return NextResponse.json({
      ready: true,
      title: typeof data.title === "string" ? data.title : null,
      site: typeof data.site_name === "string" ? data.site_name : null,
      desc: typeof data.description === "string" ? data.description : null,
    });
  } catch (e) {
    console.error("archive metadata error", e);
    return NextResponse.json(null, {status: 502});
  }
}
