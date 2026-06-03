import {unfurl} from "unfurl.js";
import {v4 as uuidv4} from "uuid";
import * as s3 from "@/lib/s3client";

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
    console.error("unfurl error", e);
    return {...fallbackOg, description: "Error: " + e.message};
  }
}

async function saveOgImages(og: Og): Promise<string[]> {
  const imageUrls: string[] = [];
  try {
    for (const image of og.images ?? []) {
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
  const href = escapeHtml(og.url);
  return (
    `<div style="margin-top:0.6em;padding:0.45em;border:1px solid #bbb;background:#fafafa">` +
    `<div style="font-size:0.85em;color:#777">引用 / ${siteName}</div>` +
    `<div><a href="${href}">${title}</a></div>` +
    `<div style="margin-top:0.35em;white-space:pre-wrap">${description}</div>` +
    `</div>`
  );
}

export function renderLinkPreviewCardHtml(og: Og, imageUrls: string[], extraHtml = ""): string {
  const siteName = escapeHtml(og.site_name ?? "(no site name)");
  const title = escapeHtml(og.title ?? og.url);
  const description = escapeHtml(og.description ?? "");
  const href = escapeHtml(og.url);
  const imagesHtml = imageUrls
    .map(
      (u) =>
        `<div style="width:80px;height:80px;margin-left:0.3em;display:flex;align-items:center;justify-content:flex-end;flex:0 0 80px"><img src="${escapeHtml(u)}" alt="" style="max-width:80px;max-height:80px;width:auto;height:auto;object-fit:contain"/></div>`
    )
    .join("");
  return (
    `<section class="link-preview" style="max-width:50em;margin:0.1em;padding:0.3em;border:1px solid #777">` +
    `<div style="font-size:0.9em;color:#777">${siteName}</div>` +
    `<div><a href="${href}">${title}</a></div>` +
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
