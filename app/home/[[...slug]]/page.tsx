"use client";

import React, {useCallback, useEffect, useRef} from "react";
import FolderListView from "@/app/home/components/FolderList/FolderListView";
import NoteEditor from "@/app/home/components/NoteEditor/NoteEditor";
import NoteListView from "@/app/home/components/NoteList/NoteListView";
import {useNote} from "@/app/home/state";
import {useFoldersAll} from "@/app/home/hooks";
import {Header} from "@/app/home/components/Header";
import {DndProvider} from "react-dnd";
import {HTML5Backend} from "react-dnd-html5-backend";
import {HotkeysProvider} from "react-hotkeys-hook";
import {SettingView} from "@/app/home/components/Setting/SettingView";
import {useLocalPrefs} from "@/app/home/useLocalPrefs";
import classNames from "classnames";
import {useIsMobile} from "@/app/home/useIsMobile";
import {useNotePermalink} from "@/app/home/useNotePermalink";
import {findFolderById} from "@/lib/folderTree";
import {mutate} from "swr";

const FOLDER_LOCK_REVALIDATE_INTERVAL_MS = 15_000;


function HomeInternal() {
  // State
  const selectedFolder = useNote(state => state.selectedFolder);
  const selectedNote = useNote(state => state.selectedNote);
  const setSelectedFolder = useNote(state => state.setSelectedFolder);
  const setSelectedNote = useNote(state => state.setSelectedNote);
  const showSideBar = useLocalPrefs(state => state.showSideBar);
  const showNoteListView = useLocalPrefs(state => state.showNoteListView);
  const setShowSideBar = useLocalPrefs(state => state.setShowSideBar);
  const setShowNoteListView = useLocalPrefs(state => state.setShowNoteListView);
  const sidebarOpen = showSideBar || showNoteListView;
  const isMobile = useIsMobile();
  const touchStart = useRef<{ x: number, y: number } | null>(null);

  // ノートのパーマリンク（?note=<id>）とブラウザの戻る/進む（History API）。
  useNotePermalink();

  const openDrawer = useCallback(() => {
    setShowSideBar(true);
    setShowNoteListView(true);
  }, [setShowSideBar, setShowNoteListView]);
  const closeDrawer = useCallback(() => {
    setShowSideBar(false);
    setShowNoteListView(false);
  }, [setShowSideBar, setShowNoteListView]);

  const onTouchStart = useCallback((ev: React.TouchEvent) => {
    const touch = ev.touches[0];
    touchStart.current = {x: touch.clientX, y: touch.clientY};
  }, []);
  const onTouchEnd = useCallback((ev: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    const touch = ev.changedTouches[0];
    if (start == null || touch == null) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

    if (sidebarOpen && dx < 0) {
      closeDrawer();
    } else if (!sidebarOpen && dx > 0) {
      openDrawer();
    }
  }, [closeDrawer, openDrawer, sidebarOpen]);

  // Data
  const {data: folders, error, isLoading} = useFoldersAll();

  // ロック解除 cookie は httpOnly なので、クライアントから直接期限を読めない。
  // 一定間隔でサーバー判定済みの見えるフォルダー一覧を再取得する。
  useEffect(() => {
    const id = window.setInterval(() => {
      mutate('/api/rpc/getFoldersAll');
    }, FOLDER_LOCK_REVALIDATE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  // 初回のみ、最初のフォルダを選択する。
  // パーマリンク復元時はノート取得がフォルダーツリー取得より先に完了することがある。
  // その場合は useNotePermalink 側の保留フォルダー解決に任せ、先頭フォルダーで上書きしない。
  useEffect(() => {
    if (
      selectedFolder == null &&
      selectedNote?.folderId == null &&
      folders != null &&
      folders.folders.length > 0
    ) {
      setSelectedFolder(folders.folders[0] as any);
    }
  }, [folders, selectedFolder, selectedNote, setSelectedFolder]);

  // ロック解除時間が過ぎて、現在のフォルダー/ノートが見えるツリーから消えたら
  // 見える範囲の先頭フォルダーへ移動する。先頭ノートの選択は NoteListView 側で行う。
  useEffect(() => {
    if (folders == null) return;
    const visibleFolders = folders.trash == null ? folders.folders : [...folders.folders, folders.trash];
    const selectedFolderVisible = selectedFolder == null || findFolderById(selectedFolder.id, visibleFolders) != null;
    const selectedNoteVisible = selectedNote == null ||
      selectedNote.folderId == null ||
      findFolderById(selectedNote.folderId, visibleFolders) != null;
    if (selectedFolderVisible && selectedNoteVisible) return;

    setSelectedFolder((folders.folders[0] ?? folders.trash ?? null) as any);
    setSelectedNote(null);
  }, [folders, selectedFolder, selectedNote, setSelectedFolder, setSelectedNote]);
  console.log("prerender HomeInternal");

  // 読み込み中なら何もしない。
  if (error) return <div className="h-full w-screen bg-gray-700 text-white">failed to load</div>
  if (isLoading) return <div className="h-full w-screen bg-gray-700 text-white">loading...</div>
  if (folders == null) return <div className="h-full w-screen bg-gray-700 text-white">folders is null</div>
  console.log("render HomeInternal");

  return (
    <main className='h-[100dvh] w-full overflow-hidden bg-red-200 flex flex-col relative'>
      <Header />
      <div
        className="relative flex flex-grow h-[0%] overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {isMobile !== true && <div className="flex min-h-0 min-w-0 flex-grow h-full">
          <div className="flex flex-col md:flex-row">
            <FolderListView />
            <NoteListView />
          </div>
          <HotkeysProvider>
            <NoteEditor />
          </HotkeysProvider>
        </div>}

        {isMobile === true && <>
          <div className={classNames(
            "flex h-full flex-none flex-col overflow-hidden",
            sidebarOpen ? "w-48" : "w-0",
          )}>
            <FolderListView forceVisible />
            <NoteListView forceVisible />
          </div>

          <div className="flex min-h-0 min-w-0 flex-1">
            <HotkeysProvider>
              <NoteEditor />
            </HotkeysProvider>
          </div>
        </>}
      </div>

      <SettingView />
    </main>
  )
}

export default function Home() {
  return (
    <DndProvider backend={HTML5Backend}>
      <HomeInternal/>
    </DndProvider>
  );
}
