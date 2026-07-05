import {buildLinkPreviewCardHtml, parseHttpUrl} from "@/lib/linkPreview";
import {archiveUrl} from "@/lib/archive";

export const dynamic = "force-dynamic";

export default async function Page(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
  }
) {
  const searchParams = await props.searchParams;
  const rawUrl = searchParams["url"];
  const url = parseHttpUrl(typeof rawUrl === "string" ? rawUrl : null)?.href;
  if (url == null) {
    return <div>不正なURLです。</div>;
  }
  console.log("unfurl url", url);

  archiveUrl(url);

  const html = await buildLinkPreviewCardHtml(url);
  return <div dangerouslySetInnerHTML={{__html: html}}/>;
}
