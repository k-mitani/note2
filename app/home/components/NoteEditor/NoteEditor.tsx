import React, {useCallback, useEffect, useRef, useState} from "react";
import {useNote} from "@/app/home/state";
import ContentEditable from 'react-contenteditable'
import {useHotkeys} from 'react-hotkeys-hook'
import {useFolderAndNotes, useSaveChanges} from "@/app/home/hooks";
import * as hooks from "@/app/home/components/NoteEditor/hooks";
import {NoteHeader} from "@/app/home/components/NoteEditor/NoteHeader";
import {useLocalPrefs} from "@/app/home/useLocalPrefs";
import {FOLDABLE_CLASS} from "@/app/home/constants";

const AUTO_SAVE_DELAY_MS = 10_000;
const NOTE_REF_COMPLETION_LIMIT = 20;
const UNTITLED_NOTE_TITLE = "無題のノート";

const hotkeysOptions = {
  enableOnFormTags: true,
  enableOnContentEditable: true,
};
const hotkeysOptionsPreventDefault = {
  preventDefault: true,
  ...hotkeysOptions,
};

type NoteRefToken = {
  noteId: number,
  range: Range,
};

type NoteRefCompletionTrigger = {
  range: Range,
  prefix: string,
};

type NoteRefCandidate = {
  id: number,
  title: string,
  summary: string,
  label: string,
};

type NoteRefCompletion = {
  range: Range,
  prefix: string,
  x: number,
  y: number,
  loading: boolean,
  candidates: NoteRefCandidate[],
  selectedIndex: number,
};

/** Ctrl系のフォーマット系コマンドをexecCommandで実行するためのフック。 */
function useExecCommandHotkey(key: string, args: [string, boolean?, string?]) {
  useHotkeys(key, () => {
    // @ts-ignore
    document.execCommand(...args);
  }, hotkeysOptionsPreventDefault);
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

function getNoteRefTokenRange(range: Range): NoteRefToken | null {
  const textNode = getTextNodeBeforeCaret(range);
  if (textNode == null) return null;

  const text = textNode.node.textContent ?? "";
  const beforeCaret = text.slice(0, textNode.offset);
  const match = beforeCaret.match(/@(\d+)$/);
  if (match == null) return null;

  const tokenStart = textNode.offset - match[0].length;
  const noteId = Number(match[1]);
  if (!Number.isSafeInteger(noteId) || noteId <= 0) return null;

  const tokenRange = document.createRange();
  tokenRange.setStart(textNode.node, tokenStart);
  tokenRange.setEnd(textNode.node, textNode.offset);
  return {noteId, range: tokenRange};
}

function getNoteRefCompletionTrigger(range: Range): NoteRefCompletionTrigger | null {
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
  return {range: tokenRange, prefix: match[1]};
}

function getRangePopupPosition(range: Range): { x: number, y: number } {
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

function insertNoteRefAnchor(range: Range, noteId: number) {
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

function getCandidateTitle(candidate: NoteRefCandidate): string {
  const title = candidate.title.trim();
  return title === "" ? UNTITLED_NOTE_TITLE : title;
}

export default function NoteEditor() {
  const note = useNote(state => state.selectedNote);
  const setNote = useNote(state => state.setSelectedNote);

  const selectedFolder = useNote(state => state.selectedFolder);
  const {notes, isFullLoaded} = useFolderAndNotes(selectedFolder?.id);
  const saveChanges = useSaveChanges(selectedFolder?.id);

  const prevNote = useRef(note);
  const refHtml = useRef(note?.content ?? "");
  const completionListRef = useRef<HTMLDivElement | null>(null);
  const [title, setTitle] = useState(note?.title ?? "");
  const [updatedAt, setUpdatedAt] = useState(note?.updatedAt ?? note?.createdAt);
  const [createdAt, setCreatedAt] = useState(note?.createdAt);

  const changedNotes = useNote(state => state.changedNotes);
  const addChangedNote = useNote(state => state.addChangedNote);
  // 変換候補選択中ならtrue
  const showingImePopup = hooks.useShowingImePopup();
  const noteRefTooltip = hooks.useNoteRefTooltip(note);
  const [noteRefCompletion, setNoteRefCompletion] = useState<NoteRefCompletion | null>(null);

  // 未保存の変更がある場合、最後の変更から AUTO_SAVE_DELAY_MS 経過したら自動保存する。
  useEffect(() => {
    if (changedNotes.size === 0) return;
    const id = setTimeout(() => {
      if (useLocalPrefs.getState().autoSave) {
        console.log("do auto save");
        saveChanges();
      }
    }, AUTO_SAVE_DELAY_MS);
    return () => clearTimeout(id);
  }, [changedNotes, saveChanges]);

  // フル版（content込み）が揃ったら、選択中ノートを content を持つ最新オブジェクトに差し替える。
  // 軽量版（content無し）のオブジェクトには差し替えない＝空本文での誤編集・誤保存を防ぐ。
  useEffect(() => {
    if (isFullLoaded && note != null) {
      const noteInNotes = notes.find(n => n.id === note.id);
      if (noteInNotes != null && noteInNotes != note) {
        setNote(noteInNotes);
      }
    }
  }, [isFullLoaded, note, notes, setNote]);


  function addToChangedNotes(id: number, title: string, content: string, updatedAt: Date | null = null, createdAt: Date | null = null) {
    addChangedNote({id, title, content, updatedAt, createdAt});
  }

  // noteが更新されたら、refHtml.currentを更新する。
  if (note !== prevNote.current) {
    console.log("noteupdated", refHtml.current);
    prevNote.current = note;
    if (note != null) {
      const n = changedNotes.get(note.id) ?? note;
      refHtml.current = n.content;
      setTitle(n.title);
      setUpdatedAt(n.updatedAt ?? note.createdAt);
      setCreatedAt(n.createdAt ?? note.createdAt);
    } else {
      refHtml.current = "";
      setTitle("");
      setUpdatedAt(new Date());
    }
  }

  const updateCurrentNoteContent = useCallback((editable: HTMLElement) => {
    if (note == null) return;
    addChangedNote({id: note.id, title, content: editable.innerHTML, updatedAt: null, createdAt: null});
    refHtml.current = editable.innerHTML;
  }, [addChangedNote, note, title]);

  const applyNoteRefCompletion = useCallback((candidate: NoteRefCandidate) => {
    const editable = document.getElementById("NoteEditor-ContentEditable");
    if (editable == null || noteRefCompletion == null) return;

    insertNoteRefAnchor(noteRefCompletion.range, candidate.id);
    updateCurrentNoteContent(editable);
    setNoteRefCompletion(null);
  }, [noteRefCompletion, updateCurrentNoteContent]);

  async function openNoteRefCompletion() {
    const editable = document.getElementById("NoteEditor-ContentEditable");
    const selectionObj = document.getSelection();
    if (selectionObj == null || selectionObj.rangeCount === 0) return;
    const range = selectionObj.getRangeAt(0);
    const selection = range.startContainer;
    if (selection == null || editable == null || !editable.contains(selection) || !range.collapsed) return;

    const trigger = getNoteRefCompletionTrigger(range);
    if (trigger == null) {
      setNoteRefCompletion(null);
      return;
    }

    const pos = getRangePopupPosition(trigger.range);
    setNoteRefCompletion({
      range: trigger.range,
      prefix: trigger.prefix,
      x: pos.x,
      y: pos.y,
      loading: true,
      candidates: [],
      selectedIndex: 0,
    });

    const params = new URLSearchParams({limit: String(NOTE_REF_COMPLETION_LIMIT)});
    if (note?.id != null) params.set("excludeId", String(note.id));

    try {
      const res = await fetch(`/api/rpc/noteRefCandidates?${params.toString()}`);
      if (!res.ok) throw new Error(`noteRefCandidates failed: ${res.status}`);
      const data = await res.json();
      const rawCandidates: unknown[] = Array.isArray(data.notes) ? data.notes : [];
      const candidates = rawCandidates
        .filter((candidate): candidate is NoteRefCandidate => {
          if (typeof candidate !== "object" || candidate == null) return false;
          const c = candidate as Partial<NoteRefCandidate>;
          return Number.isSafeInteger(c.id)
            && typeof c.label === "string"
            && typeof c.summary === "string"
            && typeof c.title === "string";
        })
        .filter((candidate: NoteRefCandidate) => (
          trigger.prefix === "" || String(candidate.id).startsWith(trigger.prefix)
        ));

      setNoteRefCompletion(prev => prev?.range === trigger.range
        ? {...prev, loading: false, candidates, selectedIndex: 0}
        : prev
      );
    } catch {
      setNoteRefCompletion(prev => prev?.range === trigger.range
        ? {...prev, loading: false, candidates: [], selectedIndex: 0}
        : prev
      );
    }
  }

  useEffect(() => {
    setNoteRefCompletion(null);
  }, [note?.id]);

  useEffect(() => {
    if (noteRefCompletion == null) return;
    const completion: NoteRefCompletion = noteRefCompletion;

    function onKeyDown(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopPropagation();
        setNoteRefCompletion(null);
        return;
      }

      if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
        ev.preventDefault();
        ev.stopPropagation();
        setNoteRefCompletion(prev => {
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
        if (completion.candidates.length === 0) return;
        const candidate = completion.candidates[completion.selectedIndex];
        if (candidate == null) return;
        ev.preventDefault();
        ev.stopPropagation();
        applyNoteRefCompletion(candidate);
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [applyNoteRefCompletion, noteRefCompletion]);

  useEffect(() => {
    if (noteRefCompletion == null) return;
    const selected = completionListRef.current?.querySelector<HTMLElement>(
      `[data-note-ref-candidate-index="${noteRefCompletion.selectedIndex}"]`
    );
    selected?.scrollIntoView({block: "nearest"});
  }, [noteRefCompletion?.selectedIndex, noteRefCompletion]);

  // フォーマット系のショートカット
  useExecCommandHotkey("ctrl+b", ["bold"]);
  useExecCommandHotkey("ctrl+u", ["underline"]);
  useExecCommandHotkey("alt+shift+5", ["strikeThrough"]);
  useExecCommandHotkey("ctrl+h", ["backColor", false, "yellow"]);
  useExecCommandHotkey("ctrl+shift+r", ["foreColor", false, "red"]);
  useExecCommandHotkey("ctrl+k", ["removeFormat"]);
  useExecCommandHotkey("ctrl+o", ["insertOrderedList"]);
  useExecCommandHotkey("ctrl+l", ["insertUnorderedList"]);
  useExecCommandHotkey("ctrl+shift+h", ["insertHorizontalRule"]);
  useExecCommandHotkey("ctrl+alt+1", ["formatBlock", false, "h1"]);
  useExecCommandHotkey("ctrl+alt+2", ["formatBlock", false, "h2"]);
  useExecCommandHotkey("ctrl+alt+3", ["formatBlock", false, "h3"]);
  useExecCommandHotkey("ctrl+alt+4", ["formatBlock", false, "h4"]);
  useExecCommandHotkey("ctrl+alt+5", ["formatBlock", false, "h5"]);
  useExecCommandHotkey("ctrl+alt+6", ["formatBlock", false, "h6"]);

  // ctrl+sで保存する。
  useHotkeys("ctrl+s", () => {
    console.log("ctrl+s");
    saveChanges();
  }, hotkeysOptionsPreventDefault);

  useHotkeys("ctrl+space", (ev: KeyboardEvent) => {
    ev.preventDefault();
    openNoteRefCompletion();
  }, hotkeysOptionsPreventDefault);

  // tabキーでインデントする。
  useHotkeys("tab", (ev: KeyboardEvent) => {
    const editable = document.getElementById("NoteEditor-ContentEditable");
    const range = document.getSelection()?.getRangeAt(0);
    if (range == null) return;
    // editableの中の要素が選択されていないなら何もしない。
    if (editable == null || !editable.contains(range.startContainer)) return;

    const startElement = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? range.startContainer as Element
      : range.startContainer.parentElement;
    // foldable内の非リスト要素でexecCommand("indent")を呼ぶと、foldable全体が
    // blockquoteで囲まれて構造が壊れるため、その場合はtab文字を挿入する。
    const inFoldableNonList = startElement?.closest(`.${FOLDABLE_CLASS.WRAPPER}`) != null
      && startElement?.closest('li') == null;

    if (!inFoldableNonList && (range.startOffset === 0 || !range.collapsed)) {
      document.execCommand("indent");
    } else if (!showingImePopup) {
      document.execCommand("insertText", false, "\t")
    }
    ev.preventDefault();
  }, hotkeysOptions);

  // shift+tabキーでアンインデントする。
  useHotkeys("shift+tab", (ev: KeyboardEvent) => {
    const editable = document.getElementById("NoteEditor-ContentEditable");
    const range = document.getSelection()?.getRangeAt(0);
    if (range == null) return;
    if (editable == null || !editable.contains(range.startContainer)) return;
    document.execCommand("outdent");
    ev.preventDefault();
  }, hotkeysOptions);

  // Ctrl+Gで折りたたみ可能な枠で囲む。
  useHotkeys("ctrl+g", (ev: KeyboardEvent) => {
    ev.preventDefault();
    const editable = document.getElementById("NoteEditor-ContentEditable");
    const selection = window.getSelection();
    if (selection == null || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editable == null || !editable.contains(range.startContainer)) return;

    // 選択範囲のコンテンツを取り出す（複数要素にまたがっていても安全）。
    const fragment = range.extractContents();

    // 折りたたみコンポーネントを作成する。
    const wrapper = document.createElement('div');
    wrapper.className = FOLDABLE_CLASS.WRAPPER;

    const header = document.createElement('div');
    header.className = FOLDABLE_CLASS.HEADER;

    // contenteditable="false"の三角マーク（クリックで折りたたむ）。
    const toggle = document.createElement('span');
    toggle.className = FOLDABLE_CLASS.TOGGLE;
    toggle.contentEditable = 'false';

    // 編集可能なタイトルエリア。
    const titleSpan = document.createElement('span');
    titleSpan.className = FOLDABLE_CLASS.TITLE;

    header.appendChild(toggle);
    header.appendChild(titleSpan);

    const content = document.createElement('div');
    content.className = FOLDABLE_CLASS.CONTENT;
    content.appendChild(fragment);

    wrapper.appendChild(header);
    wrapper.appendChild(content);
    range.insertNode(wrapper);

    // カーソルをタイトル入力エリアに置く。
    const newRange = document.createRange();
    newRange.selectNodeContents(titleSpan);
    newRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }, hotkeysOptions);

  // foldableのヘッダー内でEnterを押すと、コンテンツエリアの先頭にカーソルを移動する。
  useHotkeys("enter", (ev: KeyboardEvent) => {
    const editable = document.getElementById("NoteEditor-ContentEditable");
    const range = document.getSelection()?.getRangeAt(0);
    if (range == null || editable == null || !editable.contains(range.startContainer)) return;

    const startElement = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? range.startContainer as Element
      : range.startContainer.parentElement;
    const header = startElement?.closest(`.${FOLDABLE_CLASS.HEADER}`);
    if (header != null) {
      ev.preventDefault();
      const content = header.parentElement?.querySelector(`.${FOLDABLE_CLASS.CONTENT}`) as HTMLElement | null;
      if (content != null) {
        const newRange = document.createRange();
        newRange.selectNodeContents(content);
        newRange.collapse(true);
        const sel = window.getSelection()!;
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
    }
  }, hotkeysOptions);

  // foldableの三角マークをクリックすると折りたたむ。
  useEffect(() => {
    const editable = document.getElementById("NoteEditor-ContentEditable");
    if (editable == null) return;
    editable.addEventListener('click', onClick);

    function onClick(ev: MouseEvent) {
      const target = ev.target as HTMLElement;
      const toggle = target.closest(`.${FOLDABLE_CLASS.TOGGLE}`);
      if (toggle != null) {
        toggle.closest(`.${FOLDABLE_CLASS.WRAPPER}`)?.classList.toggle(FOLDABLE_CLASS.FOLDED);
      }
    }

    return () => {
      editable.removeEventListener('click', onClick);
    }
  }, [note]);


  // Enterキーで @123 をノート参照リンクにする。URLだけの行ならカードにする。
  useHotkeys("ctrl+enter", (ev: KeyboardEvent) => {
    ev.preventDefault();
    const editable = document.getElementById("NoteEditor-ContentEditable");
    const selectionObj = document.getSelection();
    if (selectionObj == null || selectionObj.rangeCount === 0) return;
    const range = selectionObj.getRangeAt(0);
    const selection = range.startContainer;
    if (selection == null) return;
    if (editable == null || !editable.contains(selection)) return;
    if (!range.collapsed) return;

    const noteRef = getNoteRefTokenRange(range);
    if (noteRef != null) {
      setTimeout(async () => {
        const res = await fetch(`/api/notes/${noteRef.noteId}`);
        if (!res.ok) return;
        const rawNote = await res.json();
        if (rawNote == null) return;

        insertNoteRefAnchor(noteRef.range, noteRef.noteId);
        updateCurrentNoteContent(editable);
      });
      return;
    }

    const url = selection.textContent;
    const patternUrl = /^https?:\/\/[^\s]+$/;
    if (url == null || !patternUrl.test(url)) return;
    if (url.length !== range.endOffset) return;
    setTimeout(async () => {
      const range = document.getSelection()!.getRangeAt(0);
      // URLの場合は、選択位置の次の場所にカードを挿入する。
      const res = await fetch("/getLinkPreview?url=" + url);
      const rawCard = await res.text();
      console.log("text", rawCard);
      const tmp = document.createElement("div");
      tmp.innerHTML = rawCard;
      const card = tmp.querySelector(".link-preview")!;
      if (card == null) return;
      range.insertNode(card);
      range.collapse();
      if (note == null) return;
      addToChangedNotes(note.id, title, editable.innerHTML);
      refHtml.current = editable.innerHTML;
    });
  }, hotkeysOptions);

  // Shift+Ctrl+Vでプレーンテキスト貼り付け。
  // 標準のShift+Ctrl+Vのプレーンテキスト貼り付けは、
  // カーソル移動がおかしくなるので自前で行う。
  useHotkeys("shift+ctrl+v", async (ev: KeyboardEvent) => {
    ev.preventDefault();
    const text = await navigator.clipboard.readText();
    const editable = document.getElementById("NoteEditor-ContentEditable");
    const selection = document.getSelection()?.getRangeAt(0).startContainer;
    if (selection == null) return;
    if (editable == null || !editable.contains(selection)) return;
    document.execCommand("insertText", false, text.replace(/\r/g, ""));
  }, hotkeysOptions);

  // 画像のリサイズ
  hooks.useEnableImageResize(note);

  // ノート選択中だがフル版（content）がまだ取得できていない間は、本文を編集させない。
  // 軽量版の空contentを編集・保存して本文を消してしまうのを防ぐため。
  // ただし、別フォルダーをクリックしただけ（選択ノートは前フォルダーのままで本文は
  // 取得済み）の場合は、新フォルダーの読み込み状態で誤ってローディング表示にして
  // 画面が一瞬白くチラつくのを防ぐため、選択ノートが現在のフォルダーに属するときだけ
  // ローディングを出す。
  if (note != null && note.folderId === selectedFolder?.id && !isFullLoaded) {
    // すぐ取得が終わるので「loading...」等のテキストは出さず、空のパネルにする。
    return <div className="flex min-h-0 min-w-0 grow flex-col bg-white dark:bg-black" />;
  }

  return <div className="flex min-h-0 min-w-0 grow flex-col bg-white dark:bg-black">
    {/*ヘッダー*/}
    <NoteHeader title={title}
                setTitle={setTitle}
                updatedAt={updatedAt}
                setUpdatedAt={setUpdatedAt}
                createdAt={createdAt}
                setCreatedAt={setCreatedAt}
                changedNotes={changedNotes}
                addToChangedNotes={addToChangedNotes}
    />

    {/*本文*/}
    <div className="min-h-0 min-w-0 grow overflow-y-scroll break-all p-2 dark:text-gray-300"
         onClick={hooks.onClickContent}>
      <ContentEditable html={refHtml.current}
                       id="NoteEditor-ContentEditable"
                       className="h-full w-full min-w-0"
                       style={{
                         outline: "0px solid #fff",
                         whiteSpace: "pre-wrap",
                         tabSize: 8,
                       }}
                       onPaste={hooks.onPaste}
                       onChange={ev => {
                         refHtml.current = ev.target.value
                         setNoteRefCompletion(null);
                         if (note != null) {
                           const title = changedNotes.get(note.id)?.title ?? note.title;
                           addToChangedNotes(note.id, title, ev.target.value);
                         }
                       }}
      />
    </div>
    {noteRefCompletion != null && (
      <div
        className="fixed z-50 w-80 max-w-[calc(100vw-1rem)] overflow-hidden rounded border border-gray-300 bg-white text-xs text-gray-700 shadow-lg dark:border-gray-700 dark:bg-neutral-900 dark:text-gray-200"
        style={{left: noteRefCompletion.x, top: noteRefCompletion.y}}
      >
        {noteRefCompletion.loading && (
          <div className="px-3 py-2 text-gray-500 dark:text-gray-400">loading...</div>
        )}
        {!noteRefCompletion.loading && noteRefCompletion.candidates.length === 0 && (
          <div className="px-3 py-2 text-gray-500 dark:text-gray-400">候補なし</div>
        )}
        {!noteRefCompletion.loading && noteRefCompletion.candidates.length > 0 && (
          <div className="max-h-72 overflow-y-auto py-1" ref={completionListRef}>
            {noteRefCompletion.candidates.map((candidate, index) => {
              const candidateTitle = getCandidateTitle(candidate);
              return (
                <button
                  key={candidate.id}
                  data-note-ref-candidate-index={index}
                  className={`flex w-full items-start gap-2 px-3 py-2 text-left ${index === noteRefCompletion.selectedIndex ? "bg-blue-50 dark:bg-sky-950" : "hover:bg-gray-100 dark:hover:bg-neutral-800"}`}
                  onMouseEnter={() => setNoteRefCompletion(prev => prev == null ? null : {...prev, selectedIndex: index})}
                  onMouseDown={ev => {
                    ev.preventDefault();
                    applyNoteRefCompletion(candidate);
                  }}
                >
                  <span className="shrink-0 font-mono text-[11px] leading-5 text-blue-600 dark:text-sky-400">@{candidate.id}</span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 font-medium leading-5 text-gray-900 dark:text-gray-100">
                      {candidateTitle}
                    </span>
                    {candidate.summary !== "" && (
                      <span className="mt-0.5 line-clamp-3 whitespace-normal leading-4 text-gray-500 dark:text-gray-400">
                        {candidate.summary}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    )}
    {noteRefTooltip != null && (
      <div
        className="pointer-events-none fixed z-50 max-w-xs rounded border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 shadow-lg dark:border-gray-700 dark:bg-neutral-900 dark:text-gray-200"
        style={{left: noteRefTooltip.x, top: noteRefTooltip.y}}
      >
        <div className="font-semibold text-gray-900 dark:text-gray-100">{noteRefTooltip.title}</div>
        {noteRefTooltip.loading && <div className="mt-1 text-gray-500 dark:text-gray-400">loading...</div>}
        {!noteRefTooltip.loading && noteRefTooltip.summary !== "" && (
          <div className="mt-1 line-clamp-4 whitespace-normal text-gray-600 dark:text-gray-400">
            {noteRefTooltip.summary}
          </div>
        )}
      </div>
    )}
  </div>
}
