import React, {useEffect, useState} from "react";
import {htmlToPlainText} from "@/lib/noteSummary";

const NOTE_REF_SUMMARY_LENGTH = 120;

export type NoteRefPreview = {
  title: string,
  summary: string,
};

export type NoteRefTooltip = NoteRefPreview & {
  noteId: number,
  x: number,
  y: number,
  loading: boolean,
};

const noteRefPreviewCache = new Map<number, NoteRefPreview>();

function parsePositiveInt(value: string | null | undefined): number | null {
  if (value == null || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function buildNoteRefPreview(note: any): NoteRefPreview {
  const title = typeof note?.title === "string" && note.title.trim() !== ""
    ? note.title
    : "無題のノート";
  const content = typeof note?.content === "string" ? note.content : "";
  return {
    title,
    summary: htmlToPlainText(content).substring(0, NOTE_REF_SUMMARY_LENGTH),
  };
}

function getNoteRefIdFromAnchor(anchor: HTMLAnchorElement): number | null {
  const dataId = parsePositiveInt(anchor.dataset.noteId);
  if (dataId != null) return dataId;

  const href = anchor.getAttribute("href");
  if (!href) return null;
  let url: URL;
  try {
    url = new URL(href, window.location.origin);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  const match = url.pathname.match(/^\/home\/(\d+)\/?$/);
  return parsePositiveInt(match?.[1]);
}

function getNoteRefAnchor(target: EventTarget | null): HTMLAnchorElement | null {
  if (!(target instanceof HTMLElement)) return null;
  const anchor = target.closest("a") as HTMLAnchorElement | null;
  if (anchor == null) return null;
  return getNoteRefIdFromAnchor(anchor) == null ? null : anchor;
}

function navigateToNote(noteId: number) {
  const url = new URL(window.location.href);
  url.pathname = `/home/${noteId}`;
  url.search = "";
  url.hash = "";
  window.history.pushState(null, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function getTooltipPosition(ev: MouseEvent): { x: number, y: number } {
  const margin = 12;
  const width = 320;
  const height = 140;
  return {
    x: Math.max(margin, Math.min(ev.clientX + 12, window.innerWidth - width - margin)),
    y: Math.max(margin, Math.min(ev.clientY + 18, window.innerHeight - height - margin)),
  };
}

/** IMEのポップアップが表示されているかどうかを返すフック */
export function useShowingImePopup(): boolean {
  const [isComposing, setIsComposing] = useState(false);
  useEffect(() => {
    const handleCompositionStart = () => {
      setIsComposing(true);
    };
    const handleCompositionEnd = () => {
      setIsComposing(false);
    };
    document.addEventListener('compositionstart', handleCompositionStart);
    document.addEventListener('compositionend', handleCompositionEnd);
    return () => {
      document.removeEventListener('compositionstart', handleCompositionStart);
      document.removeEventListener('compositionend', handleCompositionEnd);
    };
  }, [isComposing]);

  return isComposing;
}

export function useEnableImageResize(note: unknown) {
  // note を依存に含めることで、ノート選択直後はまだ ContentEditable が
  // マウントされていない（読み込み中のloading表示）場合でも、本文が
  // 表示されたタイミングで再実行してリスナーを取り付け直す。
  // パーマリンク復元時に editable が null で addEventListener が落ちるのを防ぐ。
  useEffect(() => {
    const editable = document.getElementById("NoteEditor-ContentEditable");
    if (editable == null) return;

    let activeImage: HTMLImageElement | null = null;
    let isResizing = false;
    let currentX = 0;
    let currentY = 0;
    let initialWidth = 0;
    let initialHeight = 0;

    function onMouseDown(ev: MouseEvent) {
      if ((ev.target as HTMLElement)?.tagName !== 'IMG') return;
      // 画像の端（右下）付近でクリックされた場合のみリサイズを開始
      const img = ev.target as HTMLImageElement;
      const rect = img.getBoundingClientRect();
      const edgeSize = 30; // リサイズを開始する端からの距離（ピクセル）

      if (ev.clientX > rect.right - edgeSize &&
        ev.clientY > rect.bottom - edgeSize) {

        isResizing = true;
        activeImage = ev.target as HTMLImageElement;
        currentX = ev.clientX;
        currentY = ev.clientY;
        initialWidth = activeImage.offsetWidth;
        initialHeight = activeImage.offsetHeight;

        // カーソルスタイルを変更
        activeImage.style.cursor = 'se-resize';

        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);

        // デフォルトのドラッグ動作を防止
        ev.preventDefault();
      }
    }

    function resize(ev: MouseEvent) {
      if (!isResizing) return;

      const deltaX = ev.clientX - currentX;
      const deltaY = ev.clientY - currentY;

      // アスペクト比を維持してリサイズ
      const aspect = initialWidth / initialHeight;
      const newWidth = Math.max(50, initialWidth + deltaX); // 最小サイズを設定

      activeImage!.style.width = newWidth + 'px';
      activeImage!.style.height = (newWidth / aspect) + 'px';
    }

    function stopResize() {
      if (isResizing && activeImage) {
        activeImage.style.cursor = 'default';
        isResizing = false;
        activeImage = null;
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
      }
    }

    // ホバー時のカーソル表示
    function onMouseMove(ev: MouseEvent) {
      if ((ev.target as HTMLElement)?.tagName === 'IMG') {
        const img = ev.target as HTMLImageElement;
        const rect = img.getBoundingClientRect();
        const edgeSize = 20;

        if (ev.clientX > rect.right - edgeSize &&
          ev.clientY > rect.bottom - edgeSize) {
          img.style.cursor = 'se-resize';
        } else {
          img.style.cursor = 'default';
        }
      }
    }

    editable.addEventListener('mousedown', onMouseDown);
    editable.addEventListener('mousemove', onMouseMove);

    return () => {
      editable.removeEventListener('mousedown', onMouseDown);
      editable.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousemove', resize);
      document.removeEventListener('mouseup', stopResize);
    };
  }, [note]);
}

export function useNoteRefTooltip(note: unknown): NoteRefTooltip | null {
  const [tooltip, setTooltip] = useState<NoteRefTooltip | null>(null);

  useEffect(() => {
    const editable = document.getElementById("NoteEditor-ContentEditable");
    if (editable == null) return;

    let currentAnchor: HTMLAnchorElement | null = null;
    let requestSeq = 0;

    function hideTooltip() {
      currentAnchor = null;
      requestSeq++;
      setTooltip(null);
    }

    hideTooltip();

    async function showTooltip(anchor: HTMLAnchorElement, noteId: number, ev: MouseEvent) {
      const pos = getTooltipPosition(ev);
      const cached = noteRefPreviewCache.get(noteId);
      if (cached != null) {
        setTooltip({...cached, noteId, ...pos, loading: false});
        return;
      }

      const seq = ++requestSeq;
      setTooltip({noteId, title: `@${noteId}`, summary: "", ...pos, loading: true});
      try {
        const res = await fetch(`/api/notes/${noteId}`);
        if (!res.ok) {
          if (currentAnchor === anchor && requestSeq === seq) setTooltip(null);
          return;
        }
        const raw = await res.json();
        if (currentAnchor !== anchor || requestSeq !== seq) return;
        if (raw == null) {
          setTooltip(null);
          return;
        }
        const preview = buildNoteRefPreview(raw);
        noteRefPreviewCache.set(noteId, preview);
        setTooltip({...preview, noteId, ...pos, loading: false});
      } catch {
        // hoverプレビューなので、取得失敗時は何も出さない。
      }
    }

    function onMouseOver(ev: MouseEvent) {
      const anchor = getNoteRefAnchor(ev.target);
      if (anchor == null || anchor === currentAnchor) return;
      const noteId = getNoteRefIdFromAnchor(anchor);
      if (noteId == null) return;
      currentAnchor = anchor;
      showTooltip(anchor, noteId, ev);
    }

    function onMouseMove(ev: MouseEvent) {
      if (currentAnchor == null) return;
      const pos = getTooltipPosition(ev);
      setTooltip(prev => prev == null ? null : {...prev, ...pos});
    }

    function onMouseOut(ev: MouseEvent) {
      const anchor = getNoteRefAnchor(ev.target);
      if (anchor == null || anchor !== currentAnchor) return;
      if (ev.relatedTarget instanceof Node && anchor.contains(ev.relatedTarget)) return;
      hideTooltip();
    }

    function onClick(ev: MouseEvent) {
      if (getNoteRefAnchor(ev.target) == null) return;
      hideTooltip();
    }

    editable.addEventListener("mouseover", onMouseOver);
    editable.addEventListener("mousemove", onMouseMove);
    editable.addEventListener("mouseout", onMouseOut);
    editable.addEventListener("click", onClick);
    return () => {
      editable.removeEventListener("mouseover", onMouseOver);
      editable.removeEventListener("mousemove", onMouseMove);
      editable.removeEventListener("mouseout", onMouseOut);
      editable.removeEventListener("click", onClick);
    };
  }, [note]);

  return tooltip;
}

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
        const res = await fetch("/api/rpc/uploadFile", {
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
