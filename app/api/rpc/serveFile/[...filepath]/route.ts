import {promises as fs} from "fs";
import path from "path";
import {NextRequest, NextResponse} from "next/server";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

export async function GET(
  _req: NextRequest,
  props: {params: Promise<{filepath: string[]}>},
) {
  const {filepath} = await props.params;
  const publicDir = path.resolve(process.cwd(), "public");
  const filePath = path.resolve(publicDir, ...filepath);

  if (!filePath.startsWith(publicDir + path.sep)) {
    return new NextResponse(null, {status: 403});
  }

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      return new NextResponse(null, {status: 404});
    }

    const body = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";

    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": contentType,
      },
    });
  } catch (e: unknown) {
    if (typeof e === "object" && e != null && "code" in e && e.code === "ENOENT") {
      return new NextResponse(null, {status: 404});
    }
    throw e;
  }
}
