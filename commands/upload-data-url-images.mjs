import "dotenv/config";
import {PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {Client} from "pg";
import {v4 as uuidv4} from "uuid";

const IMG_DATA_URL_SRC_PATTERN = /(<img\b[^>]*\bsrc=["'])(data:image\/[^"']+)(["'][^>]*>)/gi;
const DIRECTORY = "files/v1/";

const LOCAL_IMAGE_SAVE = process.env.LOCAL_IMAGE_SAVE === "true";
const LOCAL_IMAGE_PREFIX = process.env.LOCAL_IMAGE_PREFIX || "objects/";
const PREFIX = process.env.S3_PREFIX || "";
const PUBLIC_URL = process.env.S3_PUBLIC_URL;
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

const s3 = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

function extensionFromContentType(contentType) {
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

function parseDataUrl(dataUrl) {
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

async function saveObject(key, blob, contentType) {
  if (LOCAL_IMAGE_SAVE) {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const localRoot = path.resolve(process.cwd(), "data-local", "objects");
    const filePath = path.resolve(localRoot, key);
    if (!filePath.startsWith(localRoot + path.sep)) {
      throw new Error("Invalid local object key");
    }
    fs.mkdirSync(path.dirname(filePath), {recursive: true});
    fs.writeFileSync(filePath, blob);
    return `/${LOCAL_IMAGE_PREFIX}${key}`;
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: PREFIX + key,
      Body: blob,
      ContentType: contentType,
    })
  );
  return PUBLIC_URL + PREFIX + key;
}

async function uploadDataUrlImage(dataUrl) {
  const parsed = parseDataUrl(dataUrl);
  if (parsed == null) return null;

  const ext = extensionFromContentType(parsed.contentType);
  return saveObject(`${DIRECTORY}${uuidv4()}/image.${ext}`, parsed.buffer, parsed.contentType);
}

async function uploadDataUrlImages(content) {
  const replacements = new Map();
  for (const match of content.matchAll(IMG_DATA_URL_SRC_PATTERN)) {
    const dataUrl = match[2];
    if (!replacements.has(dataUrl)) {
      replacements.set(dataUrl, await uploadDataUrlImage(dataUrl));
    }
  }

  if (replacements.size === 0) return {content, imageCount: 0};

  let imageCount = 0;
  const newContent = content.replace(IMG_DATA_URL_SRC_PATTERN, (full, prefix, dataUrl, suffix) => {
    const url = replacements.get(dataUrl);
    if (url == null) return full;
    imageCount++;
    return `${prefix}${url}${suffix}`;
  });
  return {content: newContent, imageCount};
}

const client = new Client({connectionString: process.env.DATABASE_URL});
await client.connect();

const {rows} = await client.query(`
  SELECT id, title, content
  FROM "Note"
  WHERE content LIKE '%data:image/%'
  ORDER BY id
`);

let noteCount = 0;
let imageCount = 0;
try {
  for (const note of rows) {
    const result = await uploadDataUrlImages(note.content);
    if (result.content === note.content) continue;

    await client.query('UPDATE "Note" SET content = $1 WHERE id = $2', [result.content, note.id]);
    noteCount++;
    imageCount += result.imageCount;
    console.log(`updated note ${note.id}: ${result.imageCount} image(s)`);
  }
} finally {
  await client.end();
}

console.log(`done: ${noteCount} note(s), ${imageCount} image(s)`);
