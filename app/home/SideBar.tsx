import {useState} from "react";
import {Folder} from "@prisma/client";
import {atoms} from "@/app/home/atoms";
import {useRecoilState} from "recoil";
import classNames from "classnames";

type FolderAndChild = Folder & { childFolders: FolderAndChild[] };

function Header() {
  return <>
    <ul className="flex-col">
      <li>
        <button className="hover:bg-gray-600 w-full text-start">➕新規ノートブック</button>
      </li>
      <li>
        <button className="hover:bg-gray-600 w-full text-start">🔖ショートカット</button>
      </li>
    </ul>
  </>
}


const INDENT_WIDTH = 5;

function Folder({folder, selectedFolder, setSelectedFolder, indent}: {
  folder: FolderAndChild,
  selectedFolder: FolderAndChild | undefined,
  setSelectedFolder: (folder: FolderAndChild) => void,
  indent: number,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = folder.childFolders?.length > 0 ?? false;
  return (
    <>
      {/*フォルダー項目*/}
      <div className={classNames(
        "cursor-pointer flex select-none",
        "ps-" + indent,
        selectedFolder?.id === folder.id ? "bg-gray-500" : "hover:bg-gray-600",
      )}>
        {/*サブフォルダー展開ボタン*/}
        <span className={classNames(
          "flex-col hover:bg-gray-500 w-5",
          {"hidden": !hasChildren}
        )} onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? "▶" : "▼"}
        </span>

        {/*フォルダー名*/}
        <span className={classNames(
          "flex-col w-full",
        )} onClick={() => setSelectedFolder(folder)}>
          {folder.name}
        </span>
      </div>

      {/*サブフォルダー*/}
      {folder.childFolders && <ul className={classNames({hidden: isExpanded})}>
        {folder.childFolders.map(subFolder => {
          return <li key={subFolder.id}>
            <Folder folder={subFolder}
                    selectedFolder={selectedFolder}
                    setSelectedFolder={setSelectedFolder}
                    indent={indent + INDENT_WIDTH}
            />
          </li>
        })}
      </ul>}
    </>
  );
}


/**
 * スタックやノートを表示する。
 */
export default function SideBar({folders}: {
  folders: Folder[],
}) {
  const [selectedFolder, setSelectedFolder] = useRecoilState(atoms.selectedFolder);

  return (
    <div className='p-0.5 flex-none flex flex-col w-72 bg-gray-700 text-white h-screen'>
      {/*固定ヘッダー*/}
      <Header></Header>

      {/*フォルダー一覧*/}
      <ul className='mt-4 flex-col overflow-y-scroll'>
        {folders.map(folder => {
          return <li key={folder.id}>
            <Folder folder={folder as any}
                    selectedFolder={selectedFolder as any}
                    setSelectedFolder={setSelectedFolder as any}
                    indent={0}
            />
          </li>
        })}
      </ ul>
    </div>
  );
}
