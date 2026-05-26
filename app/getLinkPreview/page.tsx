import * as child_process from "child_process";
import {buildLinkPreviewCardHtml} from "@/lib/linkPreview";

export const dynamic = "force-dynamic";

const ARCHIVE_COMMAND = process.env.ARCHIVE_COMMAND;

function archiveUrl(url: string) {
  if (ARCHIVE_COMMAND == null) return;
  const command = ARCHIVE_COMMAND + " " + url;
  console.log("archive", command);
  child_process.exec(command, (error, stdout, stderr) => {
    if (error != null) console.error("archive error", error);
    if (stdout != null) console.log("archive stdout", stdout);
    if (stderr != null) console.error("archive stderr", stderr);
  });
}

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
