// 旧形式の link-preview セクションを <link-card> カスタム要素に一括変換する移行スクリプト。
// エディタによる style 正規化 (rgb() 形式等) を受けた古い世代のカードも扱えるよう、
// 正規表現でなく cheerio (DOM) でフィールドを抽出する。
// URL を持たないカード (「プレビューできないURLです」等) は変換せずそのまま残す。
// 更新日時は変更しない ($executeRaw で content と summary のみ更新)。
//
// 使い方: npx tsx --env-file=.env commands/convert-link-preview-to-link-card.ts [--apply] [--note <id>]
import fs from "node:fs";
import * as cheerio from "cheerio";
import {prisma} from "../lib/prisma";
import {renderLinkCardHtml, type LinkCardData} from "../lib/linkPreview";
import {toSummary} from "../lib/noteSummary";

const APPLY = process.argv.includes("--apply");
const noteArgIndex = process.argv.indexOf("--note");
const ONLY_NOTE_ID = noteArgIndex >= 0 ? Number(process.argv[noteArgIndex + 1]) : null;
const SECTION_RE = /<section class="link-preview"[\s\S]*?<\/section>/g;
const BACKUP_PATH = `/tmp/link-card-migration-backup-${process.pid}.json`;

function parseSection(section: string): LinkCardData | null {
  // pre-wrap の改行が <br> に変換されている世代があるため、先にテキスト改行へ戻す
  const $ = cheerio.load(section.replace(/<br\s*\/?>/gi, "\n"), null, false);
  const $section = $("section").first();
  if ($section.length === 0) return null;

  const $titleA = $section
    .find("a")
    .filter((_, el) => !($(el).attr("href") ?? "").startsWith("/archive/"))
    .first();
  const url = $titleA.attr("href");
  if (url == null || !/^https?:\/\//i.test(url)) return null; // URL なしカードは対象外

  const archiveHref = $section.find('a[href^="/archive/"]').first().attr("href");
  const archiveId = archiveHref?.match(/^\/archive\/(\d+)$/)?.[1];

  // 引用ブロック: 背景色 #fafafa / rgb(250, 250, 250) の div
  const $quote = $section
    .children("div")
    .filter((_, el) => {
      const style = $(el).attr("style") ?? "";
      return style.includes("#fafafa") || style.includes("rgb(250, 250, 250)");
    })
    .first();
  let quote: LinkCardData["quote"] = null;
  if ($quote.length > 0) {
    const $qa = $quote.find("a").first();
    quote = {
      site: $quote.children("div").first().text().replace(/^引用 \/ /, "").trim() || undefined,
      url: $qa.attr("href") || undefined,
      title: $qa.text().trim() || undefined,
      desc: $quote.children("div").last().text().trim() || undefined,
    };
  }

  // 本文行: display:flex の子 div の最初の子 div が概要
  const $body = $section
    .children("div")
    .filter((_, el) => ($(el).attr("style") ?? "").replace(/\s/g, "").includes("display:flex"))
    .first();
  const desc = $body.children("div").first().text();

  return {
    url,
    site: $section.children("div").first().text().trim() || undefined,
    title: $titleA.text() || undefined,
    desc: desc || undefined,
    img: $section.find("img").first().attr("src") || undefined,
    archiveId: archiveId != null ? Number(archiveId) : null,
    quote,
  };
}

async function main() {
  const notes = await prisma.note.findMany({
    where: {content: {contains: 'class="link-preview"'}},
    select: {id: true, title: true, content: true, updatedAt: true},
    orderBy: {id: "asc"},
  });
  const stats = {notes: 0, converted: 0, skipped: 0};
  const backup: Record<number, string> = {};

  for (const note of notes) {
    if (ONLY_NOTE_ID != null && note.id !== ONLY_NOTE_ID) continue;
    const sections = note.content.match(SECTION_RE) ?? [];
    let content = note.content;
    let converted = 0;
    for (const section of sections) {
      const data = parseSection(section);
      if (data == null) {
        stats.skipped++;
        continue;
      }
      if (ONLY_NOTE_ID != null) console.log("  ", JSON.stringify(data, null, 1));
      content = content.replace(section, renderLinkCardHtml(data));
      converted++;
    }
    if (converted === 0) continue;
    stats.notes++;
    stats.converted += converted;
    backup[note.id] = note.content;
    console.log(`note ${note.id} (${JSON.stringify(note.title).slice(0, 40)}): ${converted} cards`);
    if (APPLY) {
      // prisma.note.update は @updatedAt を自動更新してしまうため、生 SQL で更新日時を保つ
      await prisma.$executeRaw`
        update "Note" set content = ${content}, summary = ${toSummary(content)} where id = ${note.id}`;
    }
  }
  if (APPLY) fs.writeFileSync(BACKUP_PATH, JSON.stringify(backup));
  console.log(APPLY ? "APPLIED" : "DRY-RUN", stats);
  if (APPLY) console.log("backup:", BACKUP_PATH);
}

main().then(() => process.exit(0));
