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
  const anchor = document.createElement("a");
  anchor.href = `/home/${noteId}`;
  anchor.dataset.noteId = String(noteId);
  anchor.className = "note-ref";
  anchor.textContent = `@${noteId}`;

  range.deleteContents();
  range.insertNode(anchor);

  const newRange = document.createRange();
  newRange.setStartAfter(anchor);
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

export function getNoteRefAnchor(target: EventTarget | null): HTMLAnchorElement | null {
  if (!(target instanceof HTMLElement)) return null;
  const anchor = target.closest("a") as HTMLAnchorElement | null;
  if (anchor == null) return null;
  return getNoteRefIdFromAnchor(anchor) == null ? null : anchor;
}

export function navigateToNote(noteId: number) {
  const url = new URL(window.location.href);
  url.pathname = `/home/${noteId}`;
  url.search = "";
  url.hash = "";
  window.history.pushState(null, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
