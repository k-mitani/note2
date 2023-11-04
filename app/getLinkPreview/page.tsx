import {v4 as uuidv4} from "uuid";

export const dynamic = "force-dynamic";
import {unfurl} from 'unfurl.js'
import * as s3 from "@/lib/s3client";
import Image from "next/image";

export default async function Page({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const url = searchParams["url"] as string;

  console.log("unfurl url", url);
  const result = await unfurl(url);
  console.log("unfurl result", result);
  const og = result.open_graph;

  const imageUrls = [];
  try {
    for (let image of og.images ?? []) {
      // 画像を取得して保存する。
      const res = await fetch(image.url);
      const blob = await res.blob();
      const file = new File([blob], new URL(image.url).pathname, {type: blob.type});
      const DIRECTORY = "files-og/v1/";
      const filename = "image.png";
      const url = await s3.saveObject(DIRECTORY + uuidv4() + "/" + filename, file);
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
      <div style={{fontSize: "0.9em", color: "#777"}}>{og.site_name}</div>
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
