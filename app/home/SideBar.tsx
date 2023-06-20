import {useState} from "react";
import {Folder} from "@prisma/client";
import {atoms} from "@/app/home/atoms";
import {useRecoilState} from "recoil";
import classNames from "classnames";
import {mutate} from "swr";
import {useFoldersAll} from "@/app/home/hooks";
import {useLocalStorage} from "usehooks-ts";

type FolderAndChild = Folder & { childFolders: FolderAndChild[] };

const INDENT_WIDTH = 5;
const INDENTS = ["ps-0", "ps-5", "ps-10", "ps-[3.75rem]", "ps-[5rem]", "ps-[6.25rem]"];

async function createFolder(parentFolderId: number | null) {
  const newName = prompt("名前を入力してください", "新しいフォルダー");
  if (newName == null) return;
  await fetch(`/api/rpc/createFolder/${parentFolderId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    } as any,
    body: JSON.stringify({name: newName}),
  });
  await mutate('/api/rpc/getFoldersAll');
}

function Folder({folder, selectedFolder, setSelectedFolder, indent, isExpanded, setIsExpanded}: {
  folder: FolderAndChild,
  selectedFolder: FolderAndChild | undefined,
  setSelectedFolder: (folder: FolderAndChild) => void,
  indent: number,
  isExpanded: (id: number) => boolean,
  setIsExpanded: (id: number, expand: boolean) => void,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const hasChildren = folder.childFolders?.length > 0 ?? false;

  const menuItems = [
    {
      name: "名前変更", onClick: async () => {
        const newName = prompt("名前を入力してください", folder.name)
        if (newName == null) return;
        await fetch(`/api/rpc/changeFolderName/${folder.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          } as any,
          body: JSON.stringify({name: newName}),
        });
        await mutate('/api/rpc/getFoldersAll');
      }
    },
    {
      name: "ショートカットへ追加/削除", onClick: async () => {
        await fetch(`/api/rpc/toggleShortcut/${folder.id}`, {
          method: "POST",
        });
      }
    },
    {
      name: "フォルダー作成", onClick: () => createFolder(folder.id),
    },
    {
      name: "削除", onClick: async () => {
        const yes = confirm("本当に削除しますか？");
        if (!yes) return;
        await fetch(`/api/folders/${folder.id}`, {
          method: "DELETE",
        });
        await mutate('/api/rpc/getFoldersAll');
      }
    },
  ];


  return (
    <div onMouseLeave={() => setShowMenu(false)}>
      {/*フォルダー項目*/}
      <button
        className={classNames(
          "cursor-pointer select-none  w-full text-start",
          INDENTS[indent],
          selectedFolder?.id === folder.id ? "bg-gray-500" : "hover:bg-gray-600",
        )}
        title={JSON.stringify(folder)}
        onClick={() => setSelectedFolder(folder)}
        onContextMenu={(ev) => {
          setShowMenu(!showMenu);
          ev.preventDefault();
        }}
      >
        {/*サブフォルダー展開ボタン*/}
        <button className={classNames(
          "hover:bg-gray-500 w-5",
          {"hidden": !hasChildren}
        )} onClick={() => setIsExpanded(folder.id, !isExpanded(folder.id))}>
          {isExpanded(folder.id) ? "▼" : "▶"}
        </button>

        {/*フォルダー名*/}
        <span className="w-full">
          {folder.name}
        </span>
      </button>

      {/*コンテキストメニュー*/}
      {showMenu && <div className="bg-white text-black">
        <ul className="flex-col p-0.5">
          {menuItems.map(({name, onClick}) =>
            <li key={name} className="hover:bg-gray-200 w-full cursor-pointer"
                onClick={onClick}>
              {name}
            </li>
          )}
        </ul>
      </div>}

      {/*サブフォルダー*/}
      {folder.childFolders && <ul className={classNames({hidden: !isExpanded(folder.id)})}>
        {folder.childFolders.map(subFolder => {
          return <li key={subFolder.id}>
            <Folder folder={subFolder}
                    selectedFolder={selectedFolder}
                    setSelectedFolder={setSelectedFolder}
                    indent={indent + 1}
                    isExpanded={isExpanded}
                    setIsExpanded={setIsExpanded}
            />
          </li>
        })}
      </ul>}
    </div>
  );
}


/**
 * スタックやノートを表示する。
 */
export default function SideBar({onCreateNewNote}: { onCreateNewNote: () => void }) {
  const {data} = useFoldersAll();
  const [selectedFolder, setSelectedFolder] = useRecoilState(atoms.selectedFolder);
  const [isExpanded, setIsExpanded] = useLocalStorage<{
    [key: number]: boolean
  }>("SideBar.folders.isExpanded", {});

  const {folders, trash} = data ?? {folders: [], trash: null};
  return (
    <div className='p-0.5 flex-none flex flex-col w-72 bg-gray-700 text-white h-screen'>
      {/*固定ヘッダー*/}
      <div>
        <div className="m-1">
          <button className="rounded bg-gray-500 p-2 hover:bg-gray-400 w-full"
                  onClick={onCreateNewNote}>
            ノート新規作成
          </button>
        </div>
        <button className="hover:bg-gray-600 w-full text-start">🔖ショートカット</button>
      </div>

      <div className='mt-4 pt-0.5 flex-col overflow-y-auto'>
        {/*フォルダー一覧*/}
        <ul className=''>
          {folders.map(folder => {
            return <li key={folder.id}>
              <Folder folder={folder as any}
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
          <button className="pt-2 pb-2 rounded hover:bg-gray-600 w-full text-start"
                  onClick={() => createFolder(null)}>
            ➕フォルダー新規作成
          </button>
        </div>

        {/*ゴミ箱*/}
        <ul className='mt-2 flex-col overflow-y-auto'>
          {[trash!!].map(folder => {
            return <li key={folder.id}>
              <Folder folder={folder as any}
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
