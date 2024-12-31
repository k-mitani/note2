import {useLocalPreferences, useNote} from "@/app/home/state";
import classNames from "classnames";
import {useFoldersAll, useOnDropToFolder} from "@/app/home/hooks";
import {useLocalStorage} from "usehooks-ts";
import {Folder, createFolder, FolderCommonProps} from "@/app/home/components/FolderList/Folder";

/**
 * スタックやノートを表示する。
 */
export default function FolderListView() {
  // フォルダーとゴミ箱
  const {folders = [], trash = null} = useFoldersAll().data ?? {};
  // 選択中のフォルダー
  const selectedFolder = useNote(state => state.selectedFolder);
  const setSelectedFolder = useNote(state => state.setSelectedFolder);
  // サイドバーを表示するならtrue
  const showSideBar = useLocalPreferences(state => state.showSideBar);
  // フォルダーにドロップされたときの処理
  const onDropToFolder = useOnDropToFolder(selectedFolder?.id);
  // フォルダー開閉状態の辞書
  const [isExpandedDict, setIsExpandedDict] =
    useLocalStorage<{ [key: number]: boolean }>
    ("SideBar.folders.isExpanded", {});

  const common = {
    onDrop: onDropToFolder,
    allFolders: folders,
    selectedFolder: selectedFolder as any,
    setSelectedFolder: setSelectedFolder as any,
    isExpanded: (id: number) => isExpandedDict[id] ?? false,
    setIsExpanded: (id: number, expand: boolean) => {
      setIsExpandedDict({...isExpandedDict, [id]: expand});
    },
  } as FolderCommonProps;

  return (
    <div className={classNames(
      'p-0.5 flex-1 flex flex-col h-0 basis-0.5 md:flex-none md:h-full w-48 md:w-72',
      'bg-gray-700 text-white dark:bg-gray-950 dark:text-gray-300',
      {'hidden': !showSideBar}
    )}>
      {/*固定ヘッダー*/}
      <div>
        <button className="hover:bg-gray-600 w-full text-start text-sm md:text-base">🔖ショートカット</button>
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
