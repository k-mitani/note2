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

export function renderLinkPreviewCardHtml(og: Og, imageUrls: string[]): string {
  const siteName = escapeHtml(og.site_name ?? "(no site name)");
  const title = escapeHtml(og.title ?? og.url);
  const description = escapeHtml(og.description ?? "");
  const href = escapeHtml(og.url);
  const imagesHtml = imageUrls
    .map(
      (u) =>
        `<div><img src="${escapeHtml(u)}" alt="" style="margin-left:0.3em;max-height:5em;max-width:5em"/></div>`
    )
    .join("");
  return (
    `<section class="link-preview" style="max-width:50em;margin:0.1em;padding:0.3em;border:1px solid #777">` +
    `<div style="font-size:0.9em;color:#777">${siteName}</div>` +
    `<div><a href="${href}">${title}</a></div>` +
    `<div style="border-bottom:1px solid #ccc;margin:0.5em -0.3em"></div>` +
    `<div style="display:flex;align-items:center">` +
    `<div>${description}</div>` +
    imagesHtml +
    `</div>` +
    `</section>`
  );
}

export async function buildLinkPreviewCardHtml(
  url: string,
  options?: { timeoutMs?: number }
): Promise<string> {
  const timeoutMs = options?.timeoutMs;
  const run = async () => {
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
