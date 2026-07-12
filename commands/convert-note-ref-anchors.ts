// 旧形式のノート参照アンカー <a href="/home/N" data-note-id="N" class="note-ref">@N</a> を
// <note-ref note="N">@N</note-ref> カスタム要素に一括変換する移行スクリプト。
// 子テキストは元のアンカーテキストを引き継ぐ。更新日時は変更しない。
//
// 使い方: npx tsx --env-file=.env commands/convert-note-ref-anchors.ts [--apply]
import {prisma} from "../lib/prisma";
import {toSummary} from "../lib/noteSummary";

const APPLY = process.argv.includes("--apply");

// data-note-id か class="note-ref" を持つ、入れ子のないアンカーだけを対象にする
const ANCHOR_RE = /<a\b[^>]*(?:data-note-id="\d+"|class="note-ref")[^>]*>[^<]*<\/a>/g;

function convertAnchor(anchor: string): string | null {
  const id =
    anchor.match(/data-note-id="(\d+)"/)?.[1] ??
    anchor.match(/href="\/home\/(\d+)\/?"/)?.[1];
  if (id == null) return null;
  const text = anchor.match(/>([^<]*)<\/a>/)?.[1] || `@${id}`;
  return `<note-ref note="${id}" contenteditable="false">${text}</note-ref>`;
}

async function main() {
  const notes = await prisma.note.findMany({
    where: {
      OR: [
        {content: {contains: 'data-note-id="'}},
        {content: {contains: 'class="note-ref"'}},
      ],
    },
    select: {id: true, title: true, content: true},
    orderBy: {id: "asc"},
  });
  let totalConverted = 0;
  for (const note of notes) {
    let converted = 0;
    const content = note.content.replace(ANCHOR_RE, (anchor) => {
      const replaced = convertAnchor(anchor);
      if (replaced == null) return anchor;
      converted++;
      console.log(`  ${anchor} -> ${replaced}`);
      return replaced;
    });
    if (converted === 0) continue;
    totalConverted += converted;
    console.log(`note ${note.id} (${JSON.stringify(note.title).slice(0, 40)}): ${converted} refs`);
    if (APPLY) {
      // 更新日時を保つため生 SQL で更新する
      await prisma.$executeRaw`
        update "Note" set content = ${content}, summary = ${toSummary(content)} where id = ${note.id}`;
    }
  }
  console.log(APPLY ? "APPLIED" : "DRY-RUN", {notes: notes.length, converted: totalConverted});
}

main().then(() => process.exit(0));
