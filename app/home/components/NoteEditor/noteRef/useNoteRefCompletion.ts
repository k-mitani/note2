import {api} from "@/app/home/remote";
import * as utils from "@/app/utils";
import {useCallback, useEffect, useRef, useState, type RefObject} from "react";
import {
  getNoteRefCompletionTrigger,
  getRangePopupPosition,
  insertNoteRefAnchor,
} from "@/app/home/components/NoteEditor/noteRef/dom";
import {
  NOTE_REF_COMPLETION_LIMIT,
  type NoteRefCandidate,
  type NoteRefCompletionState,
} from "@/app/home/components/NoteEditor/noteRef/types";

function isNoteRefCandidate(candidate: unknown): candidate is NoteRefCandidate {
  if (typeof candidate !== "object" || candidate == null) return false;
  const c = candidate as Partial<NoteRefCandidate>;
  return Number.isSafeInteger(c.id)
    && typeof c.label === "string"
    && typeof c.summary === "string"
    && typeof c.title === "string";
}

export function useNoteRefCompletion({
  noteId,
  onContentChanged,
}: {
  noteId: number | undefined,
  onContentChanged: (editable: HTMLElement) => void,
}): {
  completion: NoteRefCompletionState | null,
  listRef: RefObject<HTMLDivElement | null>,
  open: () => Promise<void>,
  close: () => void,
  apply: (candidate: NoteRefCandidate) => void,
  setSelectedIndex: (index: number) => void,
} {
  const rangeRef = useRef<Range | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const requestSeqRef = useRef(0);
  const [completion, setCompletion] = useState<NoteRefCompletionState | null>(null);

  const close = useCallback(() => {
    requestSeqRef.current++;
    rangeRef.current = null;
    setCompletion(null);
  }, []);

  const apply = useCallback((candidate: NoteRefCandidate) => {
    const editable = document.getElementById("NoteEditor-ContentEditable");
    const range = rangeRef.current;
    if (editable == null || range == null) return;

    insertNoteRefAnchor(range, candidate.id);
    onContentChanged(editable);
    close();
  }, [close, onContentChanged]);

  const open = useCallback(async () => {
    const editable = document.getElementById("NoteEditor-ContentEditable");
    const selectionObj = document.getSelection();
    if (selectionObj == null || selectionObj.rangeCount === 0) return;
    const range = selectionObj.getRangeAt(0);
    const selection = range.startContainer;
    if (selection == null || editable == null || !editable.contains(selection) || !range.collapsed) return;

    const trigger = getNoteRefCompletionTrigger(range);
    if (trigger == null) {
      close();
      return;
    }

    const requestSeq = ++requestSeqRef.current;
    rangeRef.current = trigger.range;
    const pos = getRangePopupPosition(trigger.range);
    setCompletion({
      prefix: trigger.prefix,
      x: pos.x,
      y: pos.y,
      loading: true,
      candidates: [],
      selectedIndex: 0,
    });

    const params = new URLSearchParams({limit: String(NOTE_REF_COMPLETION_LIMIT)});
    if (noteId != null) params.set("excludeId", String(noteId));

    try {
      const res = await utils.apiFetch(api(`/api/rpc/noteRefCandidates?${params.toString()}`));
      if (!res.ok) throw new Error(`noteRefCandidates failed: ${res.status}`);
      const data = await res.json();
      const rawCandidates: unknown[] = Array.isArray(data.notes) ? data.notes : [];
      const candidates = rawCandidates
        .filter(isNoteRefCandidate)
        .filter((candidate: NoteRefCandidate) => (
          trigger.prefix === "" || String(candidate.id).startsWith(trigger.prefix)
        ));

      if (requestSeqRef.current !== requestSeq) return;
      setCompletion(prev => prev == null
        ? prev
        : {...prev, loading: false, candidates, selectedIndex: 0}
      );
    } catch {
      if (requestSeqRef.current !== requestSeq) return;
      setCompletion(prev => prev == null
        ? prev
        : {...prev, loading: false, candidates: [], selectedIndex: 0}
      );
    }
  }, [close, noteId]);

  const setSelectedIndex = useCallback((index: number) => {
    setCompletion(prev => prev == null ? null : {...prev, selectedIndex: index});
  }, []);

  useEffect(() => {
    close();
  }, [close, noteId]);

  useEffect(() => {
    if (completion == null) return;
    const currentCompletion: NoteRefCompletionState = completion;

    function onKeyDown(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopPropagation();
        close();
        return;
      }

      if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
        ev.preventDefault();
        ev.stopPropagation();
        setCompletion(prev => {
          if (prev == null || prev.candidates.length === 0) return prev;
          const direction = ev.key === "ArrowDown" ? 1 : -1;
          return {
            ...prev,
            selectedIndex: (prev.selectedIndex + direction + prev.candidates.length) % prev.candidates.length,
          };
        });
        return;
      }

      if (ev.key === "Enter" || ev.key === "Tab") {
        if (currentCompletion.candidates.length === 0) return;
        const candidate = currentCompletion.candidates[currentCompletion.selectedIndex];
        if (candidate == null) return;
        ev.preventDefault();
        ev.stopPropagation();
        apply(candidate);
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [apply, close, completion]);

  useEffect(() => {
    if (completion == null) return;
    const selected = listRef.current?.querySelector<HTMLElement>(
      `[data-note-ref-candidate-index="${completion.selectedIndex}"]`
    );
    selected?.scrollIntoView({block: "nearest"});
  }, [completion?.selectedIndex, completion]);

  return {completion, listRef, open, close, apply, setSelectedIndex};
}
