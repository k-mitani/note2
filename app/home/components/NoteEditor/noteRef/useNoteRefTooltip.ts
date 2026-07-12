import {useEffect, useState} from "react";
import {getNoteRefAnchor, getNoteRefIdFromElement} from "@/app/home/components/NoteEditor/noteRef/dom";
import {fetchNoteRefPreview} from "@/app/home/components/NoteEditor/noteRef/data";
import type {NoteRefTooltip} from "@/app/home/components/NoteEditor/noteRef/types";

function getTooltipPosition(ev: MouseEvent): { x: number, y: number } {
  const margin = 12;
  const width = 320;
  const height = 140;
  return {
    x: Math.max(margin, Math.min(ev.clientX + 12, window.innerWidth - width - margin)),
    y: Math.max(margin, Math.min(ev.clientY + 18, window.innerHeight - height - margin)),
  };
}

export function useNoteRefTooltip(note: unknown): NoteRefTooltip | null {
  const [tooltip, setTooltip] = useState<NoteRefTooltip | null>(null);

  useEffect(() => {
    const editable = document.getElementById("NoteEditor-ContentEditable");
    if (editable == null) return;

    let currentAnchor: HTMLElement | null = null;
    let requestSeq = 0;

    function hideTooltip() {
      currentAnchor = null;
      requestSeq++;
      setTooltip(null);
    }

    hideTooltip();

    async function showTooltip(anchor: HTMLElement, noteId: number, ev: MouseEvent) {
      const pos = getTooltipPosition(ev);
      const seq = ++requestSeq;
      setTooltip({noteId, title: `@${noteId}`, summary: "", ...pos, loading: true});
      try {
        const preview = await fetchNoteRefPreview(noteId);
        if (currentAnchor !== anchor || requestSeq !== seq) return;
        if (preview == null) {
          setTooltip(null);
          return;
        }
        setTooltip({...preview, noteId, ...pos, loading: false});
      } catch {
        // hoverプレビューなので、取得失敗時は何も出さない。
        if (currentAnchor === anchor && requestSeq === seq) setTooltip(null);
      }
    }

    function onMouseOver(ev: MouseEvent) {
      const anchor = getNoteRefAnchor(ev.target);
      if (anchor == null || anchor === currentAnchor) return;
      const noteId = getNoteRefIdFromElement(anchor);
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
