import {useEffect} from "react";
import {useNote} from "@/app/home/state";
import {useLocalPrefs} from "@/app/home/useLocalPrefs";
import classNames from "classnames";
import {useFoldersAll, useOnDropToFolder} from "@/app/home/hooks";
import {Folder, FolderCommonProps, FolderAndChild} from "@/app/home/components/FolderList/Folder";
import useSWR from "swr";
import type {Note} from "@/app/generated/prisma/browser";
import {createFolder} from "@/lib/folder";
import {findFolderById} from "@/lib/folderTree";
import {SHORTCUTS_FOLDING_KEY} from "@/app/home/constants";
import * as utils from "@/app/utils";
import {useSearch, useSearchStore} from "@/app/home/search";

/**
 * フォルダーやノートを表示する。
 */
export default function FolderListView({forceVisible = false}: {
  forceVisible?: boolean,
}) {
  // フォルダーとゴミ箱
  const {folders = [], trash = null} = useFoldersAll().data ?? {};
  // ブックマーク一覧
  const {data: bookmarks = []} = useSWR<Note[]>('/api/bookmarks', utils.jsonFetcher);
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

  // フォルダーを選択したら検索結果ビューを抜けて通常のフォルダー表示に戻す。
  const selectFolder = (folder: FolderAndChild) => {
    setViewingResults(false);
    setSelectedFolder(folder as any);
  };

  const common: FolderCommonProps = {
    onDrop: onDropToFolder,
    allFolders: folders,
    selectedFolder: viewingResults ? undefined : (selectedFolder as any),
    setSelectedFolder: selectFolder,
    isFolding: (id: number) => foldingDict[id] ?? true,
    setFolding: setFolding,
    searchActive,
    searchCounts: folderCounts,
  };

  return (
    <div className={classNames(
      'p-0.5 flex-1 flex flex-col h-0 basis-16 md:flex-none md:h-full w-48 md:w-60',
      'bg-gray-700 text-white dark:bg-gray-950 dark:text-gray-300',
      {'hidden': !forceVisible && !showSideBar},
    )}>
      {/*固定ヘッダー*/}
      <div>
        <button
          className="hover:bg-gray-600 w-full text-start text-sm md:text-base"
          onDoubleClick={(e) => {
            e.stopPropagation();
            setFolding(SHORTCUTS_FOLDING_KEY, !isBookmarksFolded);
          }}
        >
          🔖ショートカット <span className="text-gray-400">({bookmarks.length})</span>
          {bookmarks.length > 0 && (
            <span className="text-gray-500 ml-1">
              {isBookmarksFolded ? "▶" : "▼"}
            </span>
          )}
        </button>
        {!isBookmarksFolded && bookmarks.length > 0 && (
          <ul>
            {bookmarks.map(note => (
              <li key={note.id}>
                <button
                  className="hover:bg-gray-600 w-full text-start text-xs md:text-sm px-2 py-1 truncate"
                  onClick={() => {
                    setViewingResults(false);
                    setSelectedNote(note);
                    if (note.folderId) {
                      const folder = findFolderById(note.folderId, folders);
                      if (folder) {
                        setSelectedFolder(folder as any);
                      }
                    }
                  }}
                >
                  {note.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className='pt-0.5 flex-col overflow-y-auto'>
        {/*フォルダー一覧*/}
        <ul className=''>
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
                  onClick={() => createFolder(null)}>
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
      </div>
    </div>
  );
}
