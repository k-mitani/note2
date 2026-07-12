import type {NoteRefCompletionTrigger, NoteRefToken} from "@/app/home/components/NoteEditor/noteRef/types";

function parsePositiveInt(value: string | null | undefined): number | null {
  if (value == null || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function getTextNodeBeforeCaret(range: Range): { node: Text, offset: number } | null {
  if (range.startContainer.nodeType === Node.TEXT_NODE) {
    return {node: range.startContainer as Text, offset: range.startOffset};
  }
  if (range.startContainer.nodeType !== Node.ELEMENT_NODE || range.startOffset === 0) {
    return null;
  }

  const prev = range.startContainer.childNodes[range.startOffset - 1];
  if (prev?.nodeType !== Node.TEXT_NODE) return null;
  return {node: prev as Text, offset: prev.textContent?.length ?? 0};
}

export function getNoteRefTokenRange(range: Range): NoteRefToken | null {
  const textNode = getTextNodeBeforeCaret(range);
  if (textNode == null) return null;

  const text = textNode.node.textContent ?? "";
  const beforeCaret = text.slice(0, textNode.offset);
  const match = beforeCaret.match(/@(\d+)$/);
  if (match == null) return null;

  const tokenStart = textNode.offset - match[0].length;
  const noteId = Number(match[1] ?? "");
  if (!Number.isSafeInteger(noteId) || noteId <= 0) return null;

  const tokenRange = document.createRange();
  tokenRange.setStart(textNode.node, tokenStart);
  tokenRange.setEnd(textNode.node, textNode.offset);
  return {noteId, range: tokenRange};
}

export function getNoteRefCompletionTrigger(range: Range): NoteRefCompletionTrigger | null {
  const textNode = getTextNodeBeforeCaret(range);
  if (textNode == null) return null;

  const text = textNode.node.textContent ?? "";
  const beforeCaret = text.slice(0, textNode.offset);
  const match = beforeCaret.match(/@(\d*)$/);
  if (match == null) return null;

  const tokenStart = textNode.offset - match[0].length;
  const tokenRange = document.createRange();
  tokenRange.setStart(textNode.node, tokenStart);
  tokenRange.setEnd(textNode.node, textNode.offset);
  return {range: tokenRange, prefix: match[1] ?? ""};
}

export function getRangePopupPosition(range: Range): { x: number, y: number } {
  const rect = range.getBoundingClientRect();
  const editable = document.getElementById("NoteEditor-ContentEditable");
  const fallbackRect = editable?.getBoundingClientRect();
  const margin = 8;
  const width = 360;
  const xBase = rect.left || fallbackRect?.left || margin;
  const yBase = rect.bottom || fallbackRect?.top || margin;
  return {
    x: Math.max(margin, Math.min(xBase, window.innerWidth - width - margin)),
    y: Math.max(margin, Math.min(yBase + 6, window.innerHeight - 260)),
  };
}

export function insertNoteRefAnchor(range: Range, noteId: number) {
  // <note-ref> カスタム要素として挿入する。子テキスト (@id) はフォールバック表示・
  // summary・検索用で、実際の表示は要素が最新タイトルを取得して描画する
  const ref = document.createElement("note-ref");
  ref.setAttribute("note", String(noteId));
  ref.setAttribute("contenteditable", "false");
  ref.textContent = `@${noteId}`;

  range.deleteContents();
  range.insertNode(ref);

  const newRange = document.createRange();
  newRange.setStartAfter(ref);
  newRange.collapse(true);
  const selection = document.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(newRange);
}

export function getNoteRefIdFromAnchor(anchor: HTMLAnchorElement): number | null {
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

/** note-ref 要素または旧形式アンカーからノート ID を取り出す。 */
export function getNoteRefIdFromElement(el: HTMLElement): number | null {
  if (el.tagName === "NOTE-REF") return parsePositiveInt(el.getAttribute("note"));
  if (el instanceof HTMLAnchorElement) return getNoteRefIdFromAnchor(el);
  return null;
}

/**
 * イベントターゲットからノート参照要素 (<note-ref> または旧形式の <a>) を探す。
 * Shadow DOM 内のクリック等はホストの <note-ref> に retarget されて届く。
 */
export function getNoteRefAnchor(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  const el = target.closest("note-ref, a") as HTMLElement | null;
  if (el == null) return null;
  return getNoteRefIdFromElement(el) == null ? null : el;
}

export function navigateToNote(noteId: number) {
  const url = new URL(window.location.href);
  url.pathname = `/home/${noteId}`;
  url.search = "";
  url.hash = "";
  window.history.pushState(null, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
