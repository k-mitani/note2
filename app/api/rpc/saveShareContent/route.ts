import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";
import settings from "@/lib/settings";
import {Prisma} from ".prisma/client";
import * as child_process from "child_process";
import {buildLinkPreviewCardHtml} from "@/lib/linkPreview";
import JsonNull = Prisma.JsonNull;

const LINK_PREVIEW_TIMEOUT_MS = 8000;

const ARCHIVE_COMMAND = process.env.ARCHIVE_COMMAND;

const URL_PATTERN = /https?:\/\/[^\s<>"']+/;

type Params = {
  title: string,
  text: string,
  url: string,
  files: File[] | null,
}

async function findOrCreateInbox(folderId: number) {
  let inbox = await prisma.note.findFirst({
    where: {folderId, title: "INBOX"},
  });
  if (inbox == null) {
    inbox = await prisma.note.create({
      data: {
        title: "INBOX",
        content: "",
        folderId,
        tags: [],
        attributes: [],
        resource: JsonNull,
      },
    });
  }
  return inbox;
}

const SHORT_URL_PATTERN = /https?:\/\/t\.co\/[^\s<>"']+/g;

async function expandShortUrl(shortUrl: string): Promise<string> {
  try {
    const res = await fetch(shortUrl, {redirect: "follow"});
    return res.url;
  } catch (e) {
    console.error("expand url error", shortUrl, e);
    return shortUrl;
  }
}

async function expandAllShortUrls(text: string): Promise<string> {
  const matches = text.match(SHORT_URL_PATTERN);
  if (!matches) return text;
  let result = text;
  for (const shortUrl of [...new Set(matches)]) {
    const expanded = await expandShortUrl(shortUrl);
    result = result.replaceAll(shortUrl, expanded);
  }
  return result;
}

async function expandParams(params: Params): Promise<Params> {
  return {
    ...params,
    title: params.title ? await expandAllShortUrls(params.title) : params.title,
    text: params.text ? await expandAllShortUrls(params.text) : params.text,
    url: params.url ? (await expandShortUrl(params.url)) : params.url,
  };
}

function buildSnippet(params: Params): string {
  const parts: string[] = [];
  if (params.title?.trim()) parts.push(params.title);
  if (params.text?.trim()) parts.push(params.text);
  if (params.url) parts.push(`<a href="${params.url}">${params.url}</a>`);
  return parts.join("<br>");
}

function extractUrl(params: Params): string | null {
  if (params.url) return params.url;
  for (const val of [params.text, params.title]) {
    if (val) {
      const m = val.match(URL_PATTERN);
      if (m) return m[0];
    }
  }
  return null;
}

function archiveUrl(url: string) {
  if (ARCHIVE_COMMAND == null) return;
  // URLのschemeを検証（http/httpsのみ許可）してコマンドインジェクションを防ぐ
  if (!/^https?:\/\//i.test(url)) {
    console.warn("archive skipped: invalid URL scheme", url);
    return;
  }
  // ARCHIVE_COMMANDをスペース区切りで分割し、URLを別引数として渡す。
  // exec()（シェル経由）の代わりにexecFile()を使うことで、
  // URLに含まれる ;, &, | 等のシェル特殊文字によるコマンドインジェクションを防ぐ。
  const [cmd, ...cmdArgs] = ARCHIVE_COMMAND.split(/\s+/).filter(Boolean);
  const args = [...cmdArgs, url];
  console.log("archive", cmd, args);
  child_process.execFile(cmd, args, (error, stdout, stderr) => {
    if (error) console.error("archive error", error);
    if (stdout) console.log("archive stdout", stdout);
    if (stderr) console.error("archive stderr", stderr);
  });
}

export async function GET(
  req: NextRequest,
) {
  const entries = [...req.nextUrl.searchParams.entries()];
  const params: Params = entries.reduce((acc, v) => ({...acc, [v[0]]: v[1]}), {}) as any;

  const expanded = await expandParams(params);

  const folderId = await settings.getShareTargetFolderId();
  const inbox = await findOrCreateInbox(folderId);

  // URLが抽出できればOGカード形式で保存、失敗時は従来形式にフォールバック。
  const url = extractUrl(expanded);
  let snippet: string | null = null;
  if (url) {
    try {
      const card = await buildLinkPreviewCardHtml(url, {timeoutMs: LINK_PREVIEW_TIMEOUT_MS});
      const extras: string[] = [];
      if (expanded.title?.trim()) extras.push(expanded.title);
      if (expanded.text?.trim() && expanded.text.trim() !== url) extras.push(expanded.text);
      snippet = [...extras, card].join("<br>");
    } catch (e) {
      console.error("link preview error, falling back", e);
    }
  }
  if (snippet == null) {
    snippet = buildSnippet(expanded);
  }
  const newContent = "<br>" + snippet + "<br><br><br>" + inbox.content;

  await prisma.note.update({
    where: {id: inbox.id},
    data: {content: newContent},
  });

  // URLが含まれていればarchiveboxへ保存
  if (url) {
    archiveUrl(url);
  }

  return new NextResponse("<script>window.close();</script>", {
    headers: {"content-type": "text/html"}
  });
}
