import {useState} from "react";
import {Folder} from "@prisma/client";
import {atoms} from "@/app/home/atoms";
import {useRecoilState} from "recoil";
import classNames from "classnames";

type FolderAndChild = Folder & { childFolders: FolderAndChild[] };

function Folder({folder, selectedFolder, setSelectedFolder}: {
  folder: FolderAndChild,
  selectedFolder: FolderAndChild | undefined,
  setSelectedFolder: (folder: FolderAndChild) => void,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <>
      <strong className={"block hover:bg-gray-500 cursor-pointer"}
              onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? "▶" : "▼"}
        📘{folder.name}
      </strong>
      <ul className={classNames({hidden: isExpanded})}>
        {folder.childFolders.map(subFolder => {
          return <li
            key={subFolder.id}
            onClick={() => setSelectedFolder(subFolder)}
            className={classNames(
              "ps-5 cursor-pointer",
              selectedFolder?.name === subFolder.name ? "bg-gray-500" : "hover:bg-gray-600",
            )}>
            {subFolder.name}
          </li>
        })}
      </ul>
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
    <div className='p-2 flex-none flex flex-col w-72 bg-gray-700 text-white h-screen'>
      <ul className="flex-col">
        <li>
          <button className="hover:bg-gray-500 w-full text-start">➕新規ノートブック</button>
        </li>
        <li>
          <button className="hover:bg-gray-500 w-full text-start">🔖ショートカット</button>
        </li>
      </ul>
      <ul className='mt-4 flex-col overflow-y-scroll'>
        {folders.map(folder => {
          return <li key={folder.id}>
            <Folder folder={folder as any}
                    selectedFolder={selectedFolder as any}
                    setSelectedFolder={setSelectedFolder as any}/>
          </li>
        })}
      </ ul>
    </div>
  )
}