import React from "react";
import {getNoteRefIdFromAnchor, navigateToNote} from "@/app/home/components/NoteEditor/noteRef/dom";

/**
 * contenteditable内ではアンカーをクリックしてもデフォルトでは遷移しないため、
 * 内部ノート参照は現在画面で遷移し、それ以外のリンクは別タブで開く。
 * 外部リンクにリファラーは付けない（rel=noreferrer 相当）。
 */
export function onClickContent(ev: React.MouseEvent<HTMLDivElement>) {
  if (!(ev.target instanceof HTMLElement)) return;
  const anchor = ev.target.closest("a") as HTMLAnchorElement | null;
  if (anchor == null) return;
  const href = anchor.getAttribute("href");
  if (!href) return;
  ev.preventDefault();
  const noteId = getNoteRefIdFromAnchor(anchor);
  if (noteId != null) {
    navigateToNote(noteId);
    return;
  }
  window.open(href, "_blank", "noopener,noreferrer");
}
