import {useEffect, useState} from "react";
import {getNoteRefAnchor, getNoteRefIdFromAnchor} from "@/app/home/components/NoteEditor/noteRef/dom";
import {buildNoteRefPreview} from "@/app/home/components/NoteEditor/noteRef/preview";
import type {NoteRefPreview, NoteRefTooltip} from "@/app/home/components/NoteEditor/noteRef/types";

const noteRefPreviewCache = new Map<number, NoteRefPreview>();

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
