import React, {useEffect, useRef} from "react";
import {FaChevronLeft} from "react-icons/fa6";
import {HotkeysProvider} from "react-hotkeys-hook";
import FolderListView from "@/app/home/components/FolderList/FolderListView";
import NoteListView from "@/app/home/components/NoteList/NoteListView";
import NoteEditor from "@/app/home/components/NoteEditor/NoteEditor";
import {useNote} from "@/app/home/state";
import {useMobileNav} from "@/app/home/useMobileNav";

/**
 * モバイル(狭幅)向けのドリルダウンレイアウト。
 *
 * フォルダー一覧 → ノート一覧 → エディター を1画面ずつ全幅で表示し、
 * 戻るバーで1階層ずつ戻る。表示する中身はPCと同じコンポーネントを使い回す。
 */
export function MobileLayout() {
  const view = useMobileNav(state => state.view);
  const setView = useMobileNav(state => state.setView);

  const selectedFolder = useNote(state => state.selectedFolder);
  const selectedNote = useNote(state => state.selectedNote);

  // プログラム的なノート選択(新規作成・ショートカットなど)でもエディターへ進める。
  // タップ選択は各コンポーネント側でも進めているが、ここで取りこぼしを拾う。
  const prevNoteId = useRef<number | null>(selectedNote?.id ?? null);
  useEffect(() => {
    const id = selectedNote?.id ?? null;
    if (id != null && id !== prevNoteId.current) {
      setView("editor");
    }
    prevNoteId.current = id;
  }, [selectedNote, setView]);

  // 戻るバーのタイトルと戻り先。
  const bar = (() => {
    switch (view) {
      case "notes":
        return {back: "folders" as const, title: selectedFolder?.name ?? "ノート一覧"};
      case "editor":
        return {back: "notes" as const, title: selectedNote?.title || "ノート"};
      default:
        return {back: null, title: "フォルダー"};
    }
  })();

  return (
    <div className="flex flex-col flex-grow h-[0%]">
      {/* 戻る/タイトルバー */}
      <div className="flex items-center gap-2 px-2 py-1 bg-gray-800 dark:bg-neutral-900 text-white dark:text-gray-400 border-t border-gray-700">
        {bar.back && (
          <button
            className="rounded p-2 hover:bg-gray-600 shrink-0"
            onClick={() => setView(bar.back!)}
            aria-label="戻る"
          >
            <FaChevronLeft/>
          </button>
        )}
        <div className="truncate text-sm">{bar.title}</div>
      </div>

      {/* 中身(1ペインのみ全幅表示) */}
      <div className="flex flex-col flex-1 min-h-0">
        {view === "folders" && <FolderListView/>}
        {view === "notes" && <NoteListView/>}
        {view === "editor" && (
          <HotkeysProvider>
            <NoteEditor/>
          </HotkeysProvider>
        )}
      </div>
    </div>
  );
}
