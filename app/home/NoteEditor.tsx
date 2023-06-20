import React, {useDebugValue, useRef} from "react";
import Link from "next/link";
import * as utils from "@/app/utils";
import {format} from "date-fns";
import {Note} from "@prisma/client";
import {atoms} from "@/app/home/atoms";
import {useRecoilValue} from "recoil";
import ContentEditable from 'react-contenteditable'

export default function NoteEditor({}: {}) {
  const note = useRecoilValue(atoms.selectedNote);
  const prevNote = useRef(note);
  const refHtml = useRef(note?.content ?? "");

  // noteが更新されたら、refHtml.currentを更新する。
  if (note !== prevNote.current) {
    console.log("noteupdated", refHtml.current)
    prevNote.current = note;
    refHtml.current = note?.content ?? "";
  }

  let link = null;
  let linkText = null;
  let timeText = "";
  if (note != null) {
    // 参照元のURLを取得する。
    for (let a of note.attributes as any[]) {
      if (a.Item1 === "source-url") {
        // URLのドメイン部だけを取得する。
        link = a.Item2
        linkText = a.Item2.replace(/^(https?:\/\/)([^\/]+).*$/, "$2");
      }
    }
    // 日付を取得する。
    const date = note.updatedAt || note.createdAt;
    timeText = date && format(date, "yyyy-MM-dd HH:mm") || "";
  }

  (window as any)["__aa"] = note;
  return <div className="grow bg-white flex flex-col">
    {/*ヘッダー*/}
    <div className={"border-b-2 border-gray-200 p-2"}>
      <input className="text-blue-500 w-full"
             type="text"
             onChange={() => {}}
             value={note?.title ?? ""}></input>
      <div>
        <span className="text-xs text-gray-500">{timeText}</span>
        {link && (
          <span className="ml-1 text-xs text-blue-700">
            <Link href={link}>{linkText}</Link>
          </span>
        )}
      </div>
    </div>

    {/*本文*/}
    <div className="p-2 grow overflow-y-scroll break-all">
      <ContentEditable html={refHtml.current}
                       className="w-full h-full"
                       style={{outline: "0px solid #fff"}}
                       onChange={ev => refHtml.current = ev.target.value}
                       onBlur={() => console.log("onblur", refHtml.current)}
      />
    </div>
  </div>
}
