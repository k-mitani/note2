// ノート一覧のサマリ表示用に、HTMLタグを除いたプレーンテキストの要約を作る。
// クライアントのサマリ表示(先頭100字)とフォールバックタイトル(先頭32字)に足りる長さだけ保持する。
// この結果を Note.summary 列に保存しておき、軽量一覧では content 全文を読まずに済むようにする。
export const SUMMARY_LENGTH = 200;

const LINE_BREAK_TAG = /<\s*br\s*\/?\s*>/gi;
const BLOCK_BOUNDARY_TAG = /<\/?\s*(?:div|p|li|tr|table|ul|ol|h[1-6]|blockquote|pre|section|article|header|footer|hr)\b[^>]*>/gi;
const HTML_TAG = /<("[^"]*"|'[^']*'|[^'">])*>/g;

export function htmlToPlainText(content: string): string {
  return content
    .replace(LINE_BREAK_TAG, " ")
    .replace(BLOCK_BOUNDARY_TAG, " ")
    .replace(HTML_TAG, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function toSummary(content: string): string {
  return htmlToPlainText(content).substring(0, SUMMARY_LENGTH);
}
