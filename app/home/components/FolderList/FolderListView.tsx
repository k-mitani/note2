import {useLocalPreferences, useNote} from "@/app/home/state";
import classNames from "classnames";
import {useFoldersAll, useOnDropToFolder} from "@/app/home/hooks";
import {useLocalStorage} from "usehooks-ts";
import {Folder, createFolder} from "@/app/home/components/FolderList/Folder";

/**
 * スタックやノートを表示する。
 */
export default function FolderListView() {
  const {data} = useFoldersAll();
  const selectedFolder = useNote(state => state.selectedFolder);
  const setSelectedFolder = useNote(state => state.setSelectedFolder);
  const showSideBar = useLocalPreferences(state => state.showSideBar);

  const onDropToFolder = useOnDropToFolder(selectedFolder?.id);

  const [isExpanded, setIsExpanded] = useLocalStorage<{
    [key: number]: boolean
  }>("SideBar.folders.isExpanded", {});
  const {folders, trash} = data ?? {folders: [], trash: null};
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
              <Folder folder={folder as any}
                      onDrop={onDropToFolder}
                      allFolders={folders}
                      selectedFolder={selectedFolder as any}
                      setSelectedFolder={setSelectedFolder as any}
                      indent={0}
                      isExpanded={(id) => isExpanded[id]}
                      setIsExpanded={(id, expand) => setIsExpanded({...isExpanded, [id]: expand})}
              />
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
              <Folder folder={folder as any}
                      onDrop={onDropToFolder}
                      allFolders={[trash!!]}
                      selectedFolder={selectedFolder as any}
                      setSelectedFolder={setSelectedFolder as any}
                      indent={0}
                      isExpanded={(id) => isExpanded[id]}
                      setIsExpanded={(id, expand) => setIsExpanded({...isExpanded, [id]: expand})}
              />
            </li>
          })}
        </ ul>
      </div>
    </div>
  );
}
