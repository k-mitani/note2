import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";
import settings from "@/lib/settings";
import {Prisma} from ".prisma/client";
import JsonNull = Prisma.JsonNull;

type Params = {
  title: string,
  text: string,
  url: string,
  files: File[] | null,
}

export async function GET(
  req: NextRequest,
) {
  const entries = [...req.nextUrl.searchParams.entries()];
  const params: Params = entries.reduce((acc, v) => ({...acc, [v[0]]: v[1]}), {}) as any;

  const content =
    (params.title == null ? '' : params.title + "<br>\n") +
    (params.text == null ? '' : params.text + "<br>\n") +
    (params.url == null ? '' : `<a href="${params.url}">${params.url}</a>\n`);
  const note = await prisma.note.create({
    data: {
      title: params.title,
      content: content,
      folderId: await settings.getShareTargetFolderId(),
      tags: [],
      attributes: [],
      resource: JsonNull,
    }
  });

  return new NextResponse("<script>window.close();</script>", {
    headers: {"content-type": "text/html"}
  });
}
