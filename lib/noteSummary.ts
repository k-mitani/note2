// ノート一覧のサマリ表示用に、HTMLタグを除いたプレーンテキストの要約を作る。
// クライアントのサマリ表示(先頭100字)とフォールバックタイトル(先頭32字)に足りる長さだけ保持する。
// この結果を Note.summary 列に保存しておき、軽量一覧では content 全文を読まずに済むようにする。
export const SUMMARY_LENGTH = 200;

export function toSummary(content: string): string {
  return content
    .replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, SUMMARY_LENGTH);
}
