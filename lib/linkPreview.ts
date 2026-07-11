import {unfurl} from "unfurl.js";
import {v4 as uuidv4} from "uuid";
import * as s3 from "@/lib/s3client";
import dns from "node:dns/promises";
import net from "node:net";

/** http/https のURLのみ許可してパースする。それ以外(javascript:, file: 等)はnull。 */
export function parseHttpUrl(url: string | undefined | null): URL | null {
  if (url == null) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  return parsed;
}

/** href属性に埋め込んでよいURLならエスケープ済みで返す。不正なら "#"。 */
function toSafeHref(url: string | undefined | null): string {
  const parsed = parseHttpUrl(url);
  return parsed != null ? escapeHtml(parsed.href) : "#";
}

function isPrivateAddress(address: string): boolean {
  // IPv4射影IPv6 (::ffff:10.0.0.1) はIPv4部分で判定する
  const v4Mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (v4Mapped != null) address = v4Mapped[1];
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  const lower = address.toLowerCase();
  return (
    lower === "::" || lower === "::1" ||
    lower.startsWith("fc") || lower.startsWith("fd") || // fc00::/7
    lower.startsWith("fe8") || lower.startsWith("fe9") ||
    lower.startsWith("fea") || lower.startsWith("feb") // fe80::/10
  );
}

/**
 * SSRF対策: http/httpsであり、かつホスト名がプライベート/ループバック等の
 * アドレスに解決されないことを確認する。安全ならパース済みURLを返す。
 */
export async function assertPublicHttpUrl(url: string): Promise<URL | null> {
  const parsed = parseHttpUrl(url);
  if (parsed == null) return null;
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
  try {
    const addresses = net.isIP(hostname)
      ? [{address: hostname}]
      : await dns.lookup(hostname, {all: true});
    if (addresses.length === 0) return null;
    if (addresses.some((a) => isPrivateAddress(a.address))) return null;
  } catch {
    return null;
  }
  return parsed;
}

type Og = {
  url: string;
  site_name?: string;
  title?: string;
  description?: string;
  images?: { url: string }[];
};

type XOEmbed = {
  url: string;
  author_name?: string;
  author_url?: string;
  html?: string;
  provider_name?: string;
};

type XStatusRef = {
  id: string;
  url: string;
};

function pathNameToContentType(pathName: string): string {
  if (pathName.endsWith(".png")) return "image/png";
  if (pathName.endsWith(".jpg")) return "image/jpeg";
  if (pathName.endsWith(".jpeg")) return "image/jpeg";
  if (pathName.endsWith(".gif")) return "image/gif";
  if (pathName.endsWith(".svg")) return "image/svg+xml";
  if (pathName.endsWith(".webp")) return "image/webp";
  console.warn("unknown content type", pathName);
  return "image/png";
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function decodeHtml(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function stripHtml(html: string): string {
  return decodeHtml(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getXStatusRef(url: string): XStatusRef | null {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(decodeHtml(url));
  } catch {
    return null;
  }
  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "").replace(/^mobile\./, "");
  if (hostname !== "x.com" && hostname !== "twitter.com") return null;
  const match = parsedUrl.pathname.match(/^\/([^/]+)\/status(?:es)?\/(\d+)/);
  if (match == null) return null;
  return {
    id: match[2],
    url: `https://x.com/${match[1]}/status/${match[2]}`,
  };
}

function extractTweetText(html: string | undefined): string {
  if (html == null) return "";
  const paragraphMatch = html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
  return stripHtml(paragraphMatch?.[1] ?? html);
}

function xOEmbedToOg(embed: XOEmbed, fallbackUrl: string): Og {
  const authorUrl = embed.author_url != null ? getXStatusRef(embed.author_url)?.url ?? embed.author_url : undefined;
  const handle = authorUrl != null ? new URL(authorUrl).pathname.split("/").filter(Boolean)[0] : undefined;
  const author = embed.author_name ?? handle ?? "X";
  const title = handle != null ? `${author} (@${handle})` : author;
  return {
    url: getXStatusRef(embed.url)?.url ?? getXStatusRef(fallbackUrl)?.url ?? fallbackUrl,
    site_name: embed.provider_name ?? "X",
    title,
    description: extractTweetText(embed.html) || "（データなし）",
    images: [],
  };
}

function extractDirectQuotedXStatusUrls(html: string | undefined, sourceUrl: string): string[] {
  if (html == null) return [];
  const sourceRef = getXStatusRef(sourceUrl);
  const candidates = [
    ...html.matchAll(/href=["']([^"']+)["']/gi),
    ...html.matchAll(/https?:\/\/(?:www\.|mobile\.)?(?:x\.com|twitter\.com)\/[^"'\s<>]+/gi),
  ];
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const match of candidates) {
    const ref = getXStatusRef(match[1] ?? match[0]);
    if (ref == null || ref.id === sourceRef?.id || seen.has(ref.id)) continue;
    seen.add(ref.id);
    urls.push(ref.url);
  }
  return urls;
}

function extractTcoUrls(html: string | undefined): string[] {
  if (html == null) return [];
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const match of html.matchAll(/https?:\/\/t\.co\/[a-z0-9]+/gi)) {
    const url = match[0];
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

async function resolveRedirectUrl(url: string): Promise<string | null> {
  for (const method of ["HEAD", "GET"] as const) {
    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        headers: {
          "user-agent": "note2-link-preview/1.0",
        },
      });
      return res.url;
    } catch (e) {
      console.error("redirect resolve error", e);
    }
  }
  return null;
}

async function findQuotedXStatusUrls(html: string | undefined, sourceUrl: string): Promise<string[]> {
  const urls = extractDirectQuotedXStatusUrls(html, sourceUrl);
  const sourceRef = getXStatusRef(sourceUrl);
  const seen = new Set(urls.map((url) => getXStatusRef(url)?.id).filter((id): id is string => id != null));
  for (const finalUrl of await Promise.all(extractTcoUrls(html).slice(0, 3).map(resolveRedirectUrl))) {
    if (finalUrl == null) continue;
    const ref = getXStatusRef(finalUrl);
    if (ref == null || ref.id === sourceRef?.id || seen.has(ref.id)) continue;
    seen.add(ref.id);
    urls.push(ref.url);
  }
  return urls;
}

async function fetchXOEmbed(url: string): Promise<XOEmbed> {
  const ref = getXStatusRef(url);
  if (ref == null) throw new Error("not an X status URL");
  let lastError: unknown = null;
  for (const origin of ["https://publish.x.com/oembed", "https://publish.twitter.com/oembed"]) {
    try {
      const endpoint = new URL(origin);
      endpoint.searchParams.set("url", ref.url);
      endpoint.searchParams.set("omit_script", "1");
      endpoint.searchParams.set("dnt", "1");
      const res = await fetch(endpoint, {
        headers: {
          "user-agent": "note2-link-preview/1.0",
        },
      });
      if (!res.ok) throw new Error(`X oEmbed failed: ${res.status} ${res.statusText}`);
      return (await res.json()) as XOEmbed;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("X oEmbed failed");
}

const NON_HTML_TYPE_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(1)} GB`;
}

/** HTML 以外の URL について content-type とサイズをヘッダーから取得する。 */
async function fetchFileInfo(url: string): Promise<{ contentType: string; bytes?: number } | null> {
  for (const method of ["HEAD", "GET"] as const) {
    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        headers: {"user-agent": "note2-link-preview/1.0"},
      });
      res.body?.cancel().catch(() => {});
      if (!res.ok) continue;
      const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      if (contentType === "") continue;
      const len = Number(res.headers.get("content-length"));
      return {contentType, bytes: Number.isFinite(len) && len > 0 ? len : undefined};
    } catch {
      // HEAD 非対応サーバー等。GET にフォールバック
    }
  }
  return null;
}

async function fetchOg(url: string): Promise<Og> {
  const parsedUrl = new URL(url);
  const fallbackOg: Og = {
    url: url,
    site_name: parsedUrl.hostname,
    title: decodeURIComponent(parsedUrl.pathname.split("/").pop() || parsedUrl.pathname),
    description: "（データなし）",
    images: [],
  };
  try {
    const result = await unfurl(url);
    console.log("unfurl result", result);
    return (result.open_graph as Og) ?? {
      ...fallbackOg,
      title: result.title ?? fallbackOg.title,
      description: result.description,
    };
  } catch (e: any) {
    // unfurl は HTML 以外 (PDF 等) に対して content type エラーを投げるため、
    // その場合はエラー表示ではなくファイル種別とサイズのカードにする
    if (/wrong content type/i.test(e?.message ?? "")) {
      const info = await fetchFileInfo(url);
      const label = info == null
        ? "ファイル"
        : `${NON_HTML_TYPE_LABELS[info.contentType] ?? info.contentType} ファイル`;
      const size = info?.bytes != null ? ` (${formatBytes(info.bytes)})` : "";
      return {...fallbackOg, description: label + size};
    }
    console.error("unfurl error", e);
    return {...fallbackOg, description: "Error: " + e.message};
  }
}

async function saveOgImages(og: Og): Promise<string[]> {
  const imageUrls: string[] = [];
  try {
    for (const image of og.images ?? []) {
      if ((await assertPublicHttpUrl(image.url)) == null) continue;
      const res = await fetch(image.url);
      const buff = await res.arrayBuffer();
      const DIRECTORY = "files-og/v1/";
      const filename = "image.png";
      const contentType = pathNameToContentType(filename);
      const savedUrl = await s3.saveObject(DIRECTORY + uuidv4() + "/" + filename, buff, contentType);
      imageUrls.push(savedUrl);
    }
  } catch (e) {
    console.error(e);
  }
  return imageUrls;
}

function renderQuotedXPostHtml(og: Og): string {
  const siteName = escapeHtml(og.site_name ?? "X");
  const title = escapeHtml(og.title ?? og.url);
  const description = escapeHtml(og.description ?? "");
  const href = toSafeHref(og.url);
  return (
    `<div style="margin-top:0.6em;padding:0.45em;border:1px solid #bbb;background:#fafafa">` +
    `<div style="font-size:0.85em;color:#777">引用 / ${siteName}</div>` +
    `<div><a href="${href}" rel="noreferrer">${title}</a></div>` +
    `<div style="margin-top:0.35em;white-space:pre-wrap">${description}</div>` +
    `</div>`
  );
}

export function renderLinkPreviewCardHtml(og: Og, imageUrls: string[], extraHtml = ""): string {
  const siteName = escapeHtml(og.site_name ?? "(no site name)");
  const title = escapeHtml(og.title ?? og.url);
  const description = escapeHtml(og.description ?? "");
  const href = toSafeHref(og.url);
  const imagesHtml = imageUrls
    .map(
      (u) =>
        `<div style="width:80px;height:80px;margin-left:0.3em;display:flex;align-items:center;justify-content:flex-end;flex:0 0 80px"><img src="${escapeHtml(u)}" alt="" referrerpolicy="no-referrer" style="max-width:80px;max-height:80px;width:auto;height:auto;object-fit:contain"/></div>`
    )
    .join("");
  return (
    `<section class="link-preview" style="max-width:50em;margin:0.1em;padding:0.3em;border:1px solid #777">` +
    `<div style="font-size:0.9em;color:#777">${siteName}</div>` +
    `<div><a href="${href}" rel="noreferrer">${title}</a></div>` +
    `<div style="border-bottom:1px solid #ccc;margin:0.5em -0.3em"></div>` +
    `<div style="display:flex;align-items:center">` +
    `<div style="flex:1;min-width:0;white-space:pre-wrap">${description}</div>` +
    imagesHtml +
    `</div>` +
    extraHtml +
    `</section>`
  );
}

export async function buildLinkPreviewCardHtml(
  url: string,
  options?: { timeoutMs?: number }
): Promise<string> {
  const timeoutMs = options?.timeoutMs;
  if ((await assertPublicHttpUrl(url)) == null) {
    return `<section class="link-preview" style="max-width:50em;margin:0.1em;padding:0.3em;border:1px solid #777">` +
      `<div style="color:#777">プレビューできないURLです: ${escapeHtml(url)}</div>` +
      `</section>`;
  }
  const run = async () => {
    if (getXStatusRef(url) != null) {
      try {
        const embed = await fetchXOEmbed(url);
        const og = xOEmbedToOg(embed, url);
        const fallbackOg = await fetchOg(url);
        og.images = fallbackOg.images ?? [];
        const imageUrls = await saveOgImages(og);
        const quotedUrls = await findQuotedXStatusUrls(embed.html, og.url);
        const quotedHtml = (
          await Promise.all(
            quotedUrls.slice(0, 1).map(async (quotedUrl) => {
              const quotedEmbed = await fetchXOEmbed(quotedUrl);
              return renderQuotedXPostHtml(xOEmbedToOg(quotedEmbed, quotedUrl));
            })
          )
        ).join("");
        return renderLinkPreviewCardHtml(og, imageUrls, quotedHtml);
      } catch (e) {
        console.error("X oEmbed error", e);
      }
    }
    const og = await fetchOg(url);
    const imageUrls = await saveOgImages(og);
    return renderLinkPreviewCardHtml(og, imageUrls);
  };
  if (timeoutMs == null) return run();
  return await Promise.race([
    run(),
    new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error(`link preview timeout (${timeoutMs}ms)`)), timeoutMs)
    ),
  ]);
}
