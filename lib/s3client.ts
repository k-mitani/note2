import {S3Client, PutObjectCommand} from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

const LOCAL_IMAGE_SAVE = process.env.LOCAL_IMAGE_SAVE === "true";
const LOCAL_IMAGE_PREFIX = process.env.LOCAL_IMAGE_PREFIX || "objects/";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function createS3Client(): S3Client {
  return new S3Client({
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
    },
  });
}

function objectUrl(...parts: string[]): string {
  const segments = parts
    .join("/")
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent);
  return `/${segments.join("/")}`;
}

function saveObjectLocal(key: string, blob: ArrayBuffer): string {
  const localRoot = path.resolve(process.cwd(), "data-local", "objects");
  const filePath = path.resolve(localRoot, key);
  if (!filePath.startsWith(localRoot + path.sep)) {
    throw new Error("Invalid local object key");
  }

  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(filePath, new Uint8Array(blob));
  return objectUrl(LOCAL_IMAGE_PREFIX, key);
}

export async function saveObject(
  key: string,
  blob: ArrayBuffer,
  contentType: string | null = null
): Promise<string> {
  if (LOCAL_IMAGE_SAVE) {
    return saveObjectLocal(key, blob);
  }

  const bucketName = requireEnv("S3_BUCKET_NAME");
  const prefix = process.env.S3_PREFIX || "";
  const publicUrl = requireEnv("S3_PUBLIC_URL");

  await createS3Client().send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: prefix + key,
      Body: blob as any,
      ContentType: contentType ?? "application/octet-stream",
    })
  );
  return publicUrl + prefix + key;
}
