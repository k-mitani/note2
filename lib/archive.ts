// 外部のアーカイブサービスに URL を送る。
// ARCHIVE_API_URL が未設定の場合は何もしない。
// BASIC 認証が必要な場合は ARCHIVE_API_BASIC_USER / ARCHIVE_API_BASIC_PASSWORD を設定する。
// API 仕様: POST {ARCHIVE_API_URL}/api/snapshots に {"url": "..."} を送ると 202 が返る。
const ARCHIVE_API_URL = process.env.ARCHIVE_API_URL;
const ARCHIVE_API_BASIC_USER = process.env.ARCHIVE_API_BASIC_USER;
const ARCHIVE_API_BASIC_PASSWORD = process.env.ARCHIVE_API_BASIC_PASSWORD;

export function archiveUrl(url: string) {
  if (!ARCHIVE_API_URL) return;
  // http/https のみ許可（javascript: 等の混入を防ぐ）
  if (!/^https?:\/\//i.test(url)) {
    console.warn("archive skipped: invalid URL scheme", url);
    return;
  }
  const headers: Record<string, string> = {"content-type": "application/json"};
  if (ARCHIVE_API_BASIC_USER) {
    const cred = `${ARCHIVE_API_BASIC_USER}:${ARCHIVE_API_BASIC_PASSWORD ?? ""}`;
    headers["authorization"] = "Basic " + Buffer.from(cred).toString("base64");
  }
  // 呼び出し元をブロックしないよう投げっぱなしにする（結果はログのみ）
  fetch(new URL("/api/snapshots", ARCHIVE_API_URL), {
    method: "POST",
    headers,
    body: JSON.stringify({url, tags: ["note2"]}),
  })
    .then(async (res) => {
      if (res.ok) {
        console.log("archive requested", url, await res.json());
      } else {
        console.error("archive error", res.status, await res.text());
      }
    })
    .catch((e) => console.error("archive error", e));
}
