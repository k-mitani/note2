import {useNote} from "@/app/home/state";
import {useLocalPrefs} from "@/app/home/useLocalPrefs";
import classNames from "classnames";
import {useFoldersAll, useOnDropToFolder} from "@/app/home/hooks";
import {Folder, createFolder, FolderCommonProps} from "@/app/home/components/FolderList/Folder";
import useSWR from "swr";
import {Note} from "@prisma/client";

const fetcher = (url: string) => fetch(url).then(r => r.json());

/**
 * スタックやノートを表示する。
 */
export default function FolderListView() {
  // フォルダーとゴミ箱
  const {folders = [], trash = null} = useFoldersAll().data ?? {};
  // ブックマーク一覧
  const {data: bookmarks = []} = useSWR<Note[]>('/api/bookmarks', fetcher);
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
  const isBookmarksFolded = foldingDict[-2] ?? false;
  // フォルダーにドロップされたときの処理
  const onDropToFolder = useOnDropToFolder(selectedFolder?.id);

  const common = {
    onDrop: onDropToFolder,
    allFolders: folders,
    selectedFolder: selectedFolder as any,
    setSelectedFolder: setSelectedFolder as any,
    isFolding: (id: number) => foldingDict[id] ?? true,
    setFolding: setFolding,
  } as FolderCommonProps;

  return (
    <div className={classNames(
      'p-0.5 flex-1 flex flex-col h-0 basis-0.5 md:flex-none md:h-full w-48 md:w-72',
      'bg-gray-700 text-white dark:bg-gray-950 dark:text-gray-300',
      {'hidden': !showSideBar}
    )}>
      {/*固定ヘッダー*/}
      <div>
        <button
          className="hover:bg-gray-600 w-full text-start text-sm md:text-base mb-2"
          onDoubleClick={(e) => {
            e.stopPropagation();
            setFolding(-2, !isBookmarksFolded);
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
          <ul className="mb-2">
            {bookmarks.map(note => (
              <li key={note.id}>
                <button
                  className="hover:bg-gray-600 w-full text-start text-xs md:text-sm px-2 py-1 truncate"
                  onClick={() => {
                    setSelectedNote(note as any);
                    if (note.folderId) {
                      // フォルダーを再帰的に検索
                      const findFolder = (folders: any[], id: number): any => {
                        for (const folder of folders) {
                          if (folder.id === id) return folder;
                          if (folder.childFolders?.length > 0) {
                            const found = findFolder(folder.childFolders, id);
                            if (found) return found;
                          }
                        }
                        return null;
                      };
                      const folder = findFolder(folders, note.folderId);
                      if (folder) {
                        setSelectedFolder(folder);
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

      <div className='mt-4 pt-0.5 flex-col overflow-y-auto'>
        {/*フォルダー一覧*/}
        <ul className=''>
          {folders.map(folder => {
            return <li key={folder.id}>
              <Folder folder={folder} indent={0} common={common}/>
            </li>
          })}
        </ul>
        {/*新規フォルダー作成ボタン*/}
        <div className="mt-2">
          <button className="pt-2 pb-2 rounded hover:bg-gray-600 w-full text-start text-sm md:text-base"
                  onClick={() => createFolder(null)}>
            ➕フォルダー新規作成
          </button>
        </div>
        {/*ゴミ箱*/}
        <ul className='mt-2 flex-col overflow-y-auto'>
          {[trash!!].map(folder => {
            return <li key={folder.id}>
              <Folder folder={folder} indent={0} common={common}/>
            </li>
          })}
        </ ul>
      </div>
    </div>
  );
}
