import {useEffect} from "react";
import {useNote} from "@/app/home/state";
import {useLocalPrefs} from "@/app/home/useLocalPrefs";
import classNames from "classnames";
import {useFoldersAllFor, useOnDropToFolder} from "@/app/home/hooks";
import {RemoteServerSection} from "@/app/home/components/FolderList/RemoteServerSection";
import {SectionBookmarks} from "@/app/home/components/FolderList/SectionBookmarks";
import {Folder, FolderCommonProps, FolderAndChild} from "@/app/home/components/FolderList/Folder";
import useSWR from "swr";
import type {Note} from "@/app/generated/prisma/browser";
import {createFolder} from "@/lib/folder";
import {findFolderById} from "@/lib/folderTree";
import {SHORTCUTS_FOLDING_KEY} from "@/app/home/constants";
import * as utils from "@/app/utils";
import {useSearch, useSearchStore} from "@/app/home/search";
import {useRemoteServers, useRemoteStore} from "@/app/home/remote";
import {FaHouse} from "react-icons/fa6";

/**
 * フォルダーやノートを表示する。
 */
export default function FolderListView({forceVisible = false}: {
  forceVisible?: boolean,
}) {
  // フォルダーとゴミ箱（サイドバー上部は常にローカルのツリーを表示する）
  const {folders = [], trash = null} = useFoldersAllFor(null).data ?? {};
  // ブックマーク一覧（ローカル）
  const {data: bookmarks = []} = useSWR<Note[]>('/api/bookmarks', utils.jsonFetcher);
  // 登録済みリモートサーバー（ゴミ箱の下にセクションとして表示する）
  const {data: remoteServers} = useRemoteServers();
  const servers = remoteServers?.servers ?? [];
  const activeServer = useRemoteStore(state => state.activeServer);
  const setActiveServer = useRemoteStore(state => state.setActiveServer);
  // 選択中のフォルダー
  const selectedFolder = useNote(state => state.selectedFolder);
  const setSelectedFolder = useNote(state => state.setSelectedFolder);
  const setSelectedNote = useNote(state => state.setSelectedNote);
  // サイドバーを表示するならtrue
  const showSideBar = useLocalPrefs(state => state.showSideBar);
  // フォルダー開閉状態の辞書
  const foldingDict = useLocalPrefs(state => state.folderFoldingStateDict);
  const setFolding = useLocalPrefs(state => state.setFolderFoldingState);
  // ショートカット開閉状態
  const isBookmarksFolded = foldingDict[SHORTCUTS_FOLDING_KEY] ?? false;
  // ローカルセクションの展開状態（リモートサーバー登録時のみセクションヘッダーを表示する）
  const localExpanded = useLocalPrefs(state => state.localSectionExpanded);
  const setLocalExpanded = useLocalPrefs(state => state.setLocalSectionExpanded);
  const hasServers = servers.length > 0;
  const showLocalContent = !hasServers || localExpanded;
  // フォルダーにドロップされたときの処理
  const onDropToFolder = useOnDropToFolder(selectedFolder?.id);
  // 全フォルダー横断検索の結果（フォルダー別ヒット件数・総ヒット数）
  const {active: searchActive, folderCounts, noteIds} = useSearch();
  // 「検索結果」仮想フォルダーの表示状態
  const viewingResults = useSearchStore(state => state.viewingResults);
  const setViewingResults = useSearchStore(state => state.setViewingResults);
  // 検索が終了したら検索結果ビューも解除する。
  useEffect(() => {
    if (!searchActive && viewingResults) setViewingResults(false);
  }, [searchActive, viewingResults, setViewingResults]);

  // リモートサーバー表示中なら確認のうえローカル表示に戻す。キャンセルしたらfalseを返す。
  const switchToLocal = (): boolean => {
    if (activeServer == null) return true;
    const {changedNotes, clearChangedNotes, setSelectedNote} = useNote.getState();
    if (changedNotes.size > 0 &&
      !window.confirm("未保存の変更があります。破棄してサーバーを切り替えますか?")) {
      return false;
    }
    clearChangedNotes();
    setSelectedNote(null);
    const search = useSearchStore.getState();
    search.setInput("");
    search.setQuery("");
    search.setViewingResults(false);
    setActiveServer(null);
    return true;
  };

  // フォルダーを選択したら検索結果ビューを抜けて通常のフォルダー表示に戻す。
  // リモートサーバー表示中はローカルに切り替える。
  const selectFolder = (folder: FolderAndChild): boolean | void => {
    if (!switchToLocal()) return false;
    setViewingResults(false);
    setSelectedFolder(folder as any);
  };

  const selectBookmark = (note: Note) => {
    if (!switchToLocal()) return;
    setViewingResults(false);
    setSelectedNote(note);
    if (note.folderId) {
      const folder = findFolderById(note.folderId, folders);
      if (folder) {
        setSelectedFolder(folder as any);
      }
    }
  };

  const common: FolderCommonProps = {
    onDrop: onDropToFolder,
    allFolders: folders,
    selectedFolder: (viewingResults || activeServer != null) ? undefined : (selectedFolder as any),
    setSelectedFolder: selectFolder,
    isFolding: (id: number) => foldingDict[id] ?? true,
    setFolding: setFolding,
    searchActive: searchActive && activeServer == null,
    searchCounts: folderCounts,
  };

  return (
    <div className={classNames(
      'p-0.5 flex-1 flex flex-col h-0 basis-16 md:flex-none md:h-full w-48 md:w-60',
      'bg-gray-700 text-white dark:bg-gray-950 dark:text-gray-300',
      {'hidden': !forceVisible && !showSideBar},
    )}>
      <div id="folder-list" className='pt-0.5 flex-col overflow-y-auto'>
        {/*ローカルセクションヘッダー（リモートサーバーが登録されているときのみ表示）*/}
        {hasServers && (
          <button
            className={classNames(
              "w-full text-start text-sm md:text-base h-7 flex items-center px-1 rounded select-none",
              activeServer == null ? "bg-gray-500 dark:bg-gray-700" : "hover:bg-gray-600",
            )}
            title={`ローカル（ダブルクリックで${localExpanded ? "折りたたみ" : "展開"}）`}
            onDoubleClick={() => setLocalExpanded(!localExpanded)}
          >
            <FaHouse className="inline mr-1 text-gray-400"/>
            <span className="line-clamp-1">ローカル</span>
            <span className="text-gray-500 ml-1">
              {localExpanded ? "▼" : "▶"}
            </span>
          </button>
        )}

        {showLocalContent && <>
          {/*ショートカット（ローカル）*/}
          <SectionBookmarks
            bookmarks={bookmarks}
            folded={isBookmarksFolded}
            setFolded={(folded) => setFolding(SHORTCUTS_FOLDING_KEY, folded)}
            onSelect={selectBookmark}
          />

          {/*フォルダー一覧*/}
          <ul className='pt-0.5'>
            {folders.map(folder => {
              return <li key={folder.id}>
                <Folder folder={folder} indent={0} common={common}/>
              </li>
            })}
          </ul>
          {/*検索結果（仮想フォルダー）: 検索中のみ表示し、クリックで全フォルダー横断のヒット一覧を表示する。*/}
          {searchActive && (
            <button
              className={classNames(
                "mt-2 w-full text-start text-sm md:text-base h-7 flex items-center px-1 rounded",
                viewingResults ? "bg-gray-500 dark:bg-gray-700" : "hover:bg-gray-600",
              )}
              onClick={() => setViewingResults(true)}
            >
              🔍検索結果
              <span className="text-gray-400">&nbsp;({noteIds.length})</span>
            </button>
          )}
          {/*新規フォルダー作成ボタン*/}
          <div className="mt-2">
            <button className="pt-2 pb-2 rounded hover:bg-gray-600 w-full text-start text-sm md:text-base"
                    onClick={() => {
                      // 作成はアクティブサーバーのAPIに対して行われるため、先にローカルへ切り替える。
                      if (!switchToLocal()) return;
                      createFolder(null);
                    }}>
              ➕フォルダー新規作成
            </button>
          </div>
          {/*ゴミ箱*/}
          {trash && (
            <ul className='mt-2 flex-col overflow-y-auto'>
              <li key={trash.id}>
                <Folder folder={trash} indent={0} common={common}/>
              </li>
            </ul>
          )}
        </>}

        {/*リモートサーバー: 登録済みサーバーごとのセクション。ダブルクリックで接続・展開する。*/}
        {servers.map(server => (
          <RemoteServerSection key={server.id} server={server}/>
        ))}
      </div>
    </div>
  );
}
