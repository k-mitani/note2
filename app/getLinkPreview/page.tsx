import {v4 as uuidv4} from "uuid";
import * as child_process from "child_process";

export const dynamic = "force-dynamic";
import {unfurl} from 'unfurl.js'
import * as s3 from "@/lib/s3client";

const ARCHIVE_COMMAND = process.env.ARCHIVE_COMMAND;

function pathNameToContentType(pathName: string): string {
  if (pathName.endsWith(".png")) return "image/png";
  if (pathName.endsWith(".jpg")) return "image/jpeg";
  if (pathName.endsWith(".jpeg")) return "image/jpeg";
  if (pathName.endsWith(".gif")) return "image/gif";
  if (pathName.endsWith(".svg")) return "image/svg+xml";
  if (pathName.endsWith(".webp")) return "image/webp";
  console.warn("unknown content type", pathName)
  return "image/png";
}

export default async function Page(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
  }
) {
  const searchParams = await props.searchParams;
  const url = searchParams["url"] as string;
  console.log("unfurl url", url);
  try {
    const result = await unfurl(url);
    console.log("unfurl result", result);
    var og = result.open_graph;
  } catch (e: any) {
    console.error("unfurl error", e);
    og = {
      url: url,
      site_name: new URL(url).hostname,
      title: new URL(url).pathname,
      description: "Error: " + e.message,
      images: [],
    } as any;
  }

  if (ARCHIVE_COMMAND != null) {
    const command = ARCHIVE_COMMAND + " " + url;
    console.log("archive", command);
    child_process.exec(command, (error, stdout, stderr) => {
      if (error != null) {
        console.error("archive error", error);
      }
      if (stdout != null) {
        console.log("archive stdout", stdout);
      }
      if (stderr != null) {
        console.error("archive stderr", stderr);
      }
    });
  }

  const imageUrls = [];
  try {
    for (let image of og.images ?? []) {
      // 画像を取得して保存する。
      const res = await fetch(image.url);
      const buff = await res.arrayBuffer();


      const DIRECTORY = "files-og/v1/";
      const filename = "image.png";
      const contentType = pathNameToContentType(filename);
      const url = await s3.saveObject(DIRECTORY + uuidv4() + "/" + filename, buff, contentType);
      imageUrls.push(url);
    }
  } catch (e) {
    console.error(e);
  }
  return (
    <section
      className="link-preview"
      style={{
        maxWidth: "50em",
        margin: "0.1em",
        padding: "0.3em",
        border: "1px solid #777",
      }}>
      <div style={{fontSize: "0.9em", color: "#777"}}>{og.site_name ?? '(no site name)'}</div>
      <div><a href={og.url}>{og.title}</a></div>
      <div style={{borderBottom: "1px solid #ccc", margin: "0.5em -0.3em"}}></div>
      <div style={{
        display: "flex",
        alignItems: "center",
      }}>
        <div>{og.description}</div>
        {imageUrls.map((url, i) => (
          <div key={i}>
            <img src={url}
                 alt=""
                 style={{marginLeft: "0.3em", maxHeight: "5em", maxWidth: "5em"}}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
