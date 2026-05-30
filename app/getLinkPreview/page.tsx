import {buildLinkPreviewCardHtml} from "@/lib/linkPreview";
import {archiveUrl} from "@/lib/archive";

export const dynamic = "force-dynamic";

export default async function Page(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
  }
) {
  const searchParams = await props.searchParams;
  const url = searchParams["url"] as string;
  console.log("unfurl url", url);

  archiveUrl(url);

  const html = await buildLinkPreviewCardHtml(url);
  return <div dangerouslySetInnerHTML={{__html: html}}/>;
}
