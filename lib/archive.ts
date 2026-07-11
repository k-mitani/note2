// 外部のアーカイブサービスに URL を送る。
// ARCHIVE_API_URL が未設定の場合は何もしない。
// BASIC 認証が必要な場合は ARCHIVE_API_BASIC_USER / ARCHIVE_API_BASIC_PASSWORD を設定する。
// API 仕様: POST {ARCHIVE_API_URL}/api/snapshots に {"url": "..."} を送ると 202 と {"id": ...} が返る。
// 成功時は note2 内のリダイレクトパス /archive/{id} を返す（失敗時は null）。
// ノートに埋め込む URL はこのパスに統一する
// （閲覧ページへの転送は app/archive/[id]/route.ts が ARCHIVE_PUBLIC_URL を使って行う）。
const ARCHIVE_API_URL = process.env.ARCHIVE_API_URL;
const ARCHIVE_PUBLIC_URL = process.env.ARCHIVE_PUBLIC_URL;
const ARCHIVE_API_BASIC_USER = process.env.ARCHIVE_API_BASIC_USER;
const ARCHIVE_API_BASIC_PASSWORD = process.env.ARCHIVE_API_BASIC_PASSWORD;

const REQUEST_TIMEOUT_MS = 5000;

export async function archiveUrl(url: string): Promise<string | null> {
  if (!ARCHIVE_API_URL) return null;
  // http/https のみ許可（javascript: 等の混入を防ぐ）
  if (!/^https?:\/\//i.test(url)) {
    console.warn("archive skipped: invalid URL scheme", url);
    return null;
  }
  const headers: Record<string, string> = {"content-type": "application/json"};
  if (ARCHIVE_API_BASIC_USER) {
    const cred = `${ARCHIVE_API_BASIC_USER}:${ARCHIVE_API_BASIC_PASSWORD ?? ""}`;
    headers["authorization"] = "Basic " + Buffer.from(cred).toString("base64");
  }
  // 登録はキュー投入のみで即応答するが、呼び出し元を塞がないようタイムアウトを設ける
  try {
    const res = await fetch(new URL("/api/snapshots", ARCHIVE_API_URL), {
      method: "POST",
      headers,
      body: JSON.stringify({url, tags: ["note2"]}),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("archive error", res.status, await res.text());
      return null;
    }
    const result = await res.json();
    console.log("archive requested", url, result);
    if (!ARCHIVE_PUBLIC_URL || typeof result?.id !== "number") return null;
    return `/archive/${result.id}`;
  } catch (e) {
    console.error("archive error", e);
    return null;
  }
}
