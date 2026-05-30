import {v4 as uuidv4} from "uuid";
import * as s3 from "@/lib/s3client";

const IMG_DATA_URL_SRC_PATTERN = /(<img\b[^>]*\bsrc=["'])(data:image\/[^"']+)(["'][^>]*>)/gi;
const DIRECTORY = "files/v1/";

function extensionFromContentType(contentType: string): string {
  switch (contentType.toLowerCase()) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    case "image/bmp":
      return "bmp";
    case "image/avif":
      return "avif";
    default:
      return "bin";
  }
}

function parseDataUrl(dataUrl: string): {contentType: string, buffer: Buffer} | null {
  const match = dataUrl.match(/^data:([^;,]+)((?:;[^,]+)*),(.*)$/s);
  if (match == null) return null;

  const contentType = match[1];
  if (!contentType.toLowerCase().startsWith("image/")) return null;

  const metadata = match[2];
  const data = match[3];
  const buffer = metadata.toLowerCase().includes(";base64")
    ? Buffer.from(data, "base64")
    : Buffer.from(decodeURIComponent(data), "utf8");
  return {contentType, buffer};
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

export async function uploadDataUrlImages(content: string): Promise<string> {
  const replacements = new Map<string, Promise<string | null>>();

  for (const match of content.matchAll(IMG_DATA_URL_SRC_PATTERN)) {
    const dataUrl = match[2];
    if (!replacements.has(dataUrl)) {
      replacements.set(dataUrl, uploadDataUrlImage(dataUrl));
    }
  }

  if (replacements.size === 0) return content;

  const resolved = new Map<string, string | null>();
  for (const [dataUrl, replacement] of replacements) {
    resolved.set(dataUrl, await replacement);
  }

  return content.replace(IMG_DATA_URL_SRC_PATTERN, (full, prefix, dataUrl, suffix) => {
    const url = resolved.get(dataUrl);
    return url == null ? full : `${prefix}${url}${suffix}`;
  });
}

async function uploadDataUrlImage(dataUrl: string): Promise<string | null> {
  const parsed = parseDataUrl(dataUrl);
  if (parsed == null) return null;

  const ext = extensionFromContentType(parsed.contentType);
  return s3.saveObject(
    `${DIRECTORY}${uuidv4()}/image.${ext}`,
    toArrayBuffer(parsed.buffer),
    parsed.contentType,
  );
}
