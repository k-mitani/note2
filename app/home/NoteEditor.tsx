import React, {useDebugValue} from "react";
import Link from "next/link";
import * as utils from "@/app/utils";
import {format} from "date-fns";
import {Note} from "@prisma/client";

export default function NoteEditor({note}: { note: Note | null }) {
  if (note == null) return <div className={"bg-white h-screen overflow-y-scroll "}>xx</div>;

  let link = null;
  let linkText = null;
  if (note.attributes != null) {
    for (let a of note.attributes) {
      if (a.Item1 === "source-url") {
        // URLのドメイン部だけを取得する。
        link = a.Item2
        linkText = a.Item2.replace(/^(https?:\/\/)([^\/]+).*$/, "$2");
      }
    }
  }
  const date = note.updatedAt || note.createdAt;
  const timeText = date && format(date, "yyyy-MM-dd HH:mm") || "";
  return <div className={"grow bg-white h-screen overflow-y-scroll "}>
    <div className={"border-b-2 border-gray-200 p-2"}>
      <input className="text-blue-500 w-full" type="text" value={note.title}></input>
      <div>
        <span className="text-xs text-gray-500">{timeText}</span>
        {link && (
          <span className="ml-1 text-xs text-blue-700">
            <Link href={link}>{linkText}</Link>
          </span>
        )}
      </div>
    </div>
    <div className={"p-2"}>
      <div dangerouslySetInnerHTML={{__html: note.content}}>
      </div>
    </div>
  </div>
}
