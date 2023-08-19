import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";
import settings from "@/lib/settings";

type Params = {
  title: string,
  text: string,
  url: string,
  files: File[] | null,
}

export async function GET(req: NextRequest) {
  return await process(req);
}

export async function POST(req: NextRequest) {
  return await process(req);
}

async function process(
  req: NextRequest,
) {
  const entries = [...req.nextUrl.searchParams.entries()];
  const params: Params = entries.reduce((acc, v) => ({...acc, [v[0]]: v[1]}), {}) as any;

  const content =
    (params.text == null ? '' : params.text + "<br>") +
    (params.url == null ? '' : `<a href="${params.url}">${params.url}</a>`);
  const note = await prisma.note.create({
    data: {
      title: params.title,
      content: content,
      folderId: await settings.getShareTargetFolderId()
    }
  });

  return NextResponse.json("ok");
}

function test() {
  fetch("/api/rpc/web-share-target?" + new URLSearchParams({
    title: "たいとる",
    text: "test",
    url: "http://www.example.com/",
  }), {
    method: "POST",
  });
}

