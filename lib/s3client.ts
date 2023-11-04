import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand
} from "@aws-sdk/client-s3";
import {StreamingBlobPayloadInputTypes} from "@smithy/types";

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

export async function saveObject(key: string, file: File): Promise<string> {
  await S3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: PREFIX + key,
      Body: await file.arrayBuffer() as any,
      ContentType: file.type,
    })
  );
  return PUBLIC_URL + PREFIX + key;
}