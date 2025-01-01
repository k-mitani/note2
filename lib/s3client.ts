import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand
} from "@aws-sdk/client-s3";
import {StreamingBlobPayloadInputTypes} from "@smithy/types";

const LOCAL_IMAGE_SAVE = process.env.LOCAL_IMAGE_SAVE === "true";
const LOCAL_IMAGE_PREFIX = process.env.LOCAL_IMAGE_PREFIX || "objects/";

const ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  throw new Error("Missing credentials");
}

const REGION = process.env.S3_REGION;
const ENDPOINT = process.env.S3_ENDPOINT;
const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const PREFIX = process.env.S3_PREFIX || "";
const PUBLIC_URL = process.env.S3_PUBLIC_URL;
if (!BUCKET_NAME) {
  throw new Error("Missing bucket name");
}

const S3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

function saveObjectLocal(key: string, blob: ArrayBuffer): string {
  const fs = require("fs");
  const path = require("path");
  const cwd = process.cwd();
  const filePath = path.join(cwd, "public", LOCAL_IMAGE_PREFIX, key);
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(filePath, Buffer.from(blob));
  return `/${LOCAL_IMAGE_PREFIX}${key}`;
}

export async function saveObject(
  key: string,
  blob: ArrayBuffer,
  contentType: string | null = null
): Promise<string> {
  if (LOCAL_IMAGE_SAVE) {
    return saveObjectLocal(key, blob);
  }

  await S3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: PREFIX + key,
      Body: blob as any,
      ContentType: contentType ?? "application/octet-stream",
    })
  );
  return PUBLIC_URL + PREFIX + key;
}