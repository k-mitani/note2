export const dynamic = "force-dynamic";
import {unfurl} from 'unfurl.js'

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
      <div>{og.description}</div>
    </section>
  );
}
