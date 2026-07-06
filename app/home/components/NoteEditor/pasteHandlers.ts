import {api} from "@/app/home/remote";
import * as utils from "@/app/utils";
import React from "react";

export async function onPaste(ev: React.ClipboardEvent<HTMLDivElement>) {
  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    let bytes = new Uint8Array(buffer);
    let len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // 添付ファイルありの場合
  if (ev.clipboardData.files.length > 0) {
    ev.preventDefault();
    // await後はev.currentTargetがnull化されるため、要素参照を先に取得しておく。
    const editable = document.getElementById("NoteEditor-ContentEditable");
    for (let file of ev.clipboardData.files) {
      if (file.type.includes("image/")) {
        const data = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(data);
        const src = `data:image/png;base64,${base64}`;
        const img = document.createElement("img");
        img.src = src;
        // document.execCommand("insertHTML", false, img.outerHTML);
        const range = document.getSelection()!.getRangeAt(0);
        range.insertNode(img);
        range.collapse();

        const formData = new FormData();
        formData.append("file", file);
        const res = await utils.apiFetch(api("/api/rpc/uploadFile"), {
          method: "POST",
          body: formData,
        });
        const url = await res.json();
        img.src = url;
        console.log("url2", url);
        // img.srcのプログラム的な更新ではContentEditableのonChangeが発火せず、
        // changedNotes/refHtmlにdata URLが残ってしまう。input イベントを発火させて
        // S3 URL化済みのinnerHTMLを変更内容として確定させる。
        editable?.dispatchEvent(new Event("input", {bubbles: true}));
      }
    }
    return;
  }
}
