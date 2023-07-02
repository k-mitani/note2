import {useCallback, useEffect, useState} from "react";
import {Folder} from "@prisma/client";
import {atoms} from "@/app/home/atoms";
import {useRecoilState} from "recoil";
import classNames from "classnames";
import {mutate} from "swr";
import {useFoldersAll} from "@/app/home/hooks";
import {useLocalStorage} from "usehooks-ts";
import {useRecoilLocalStorage} from "@/app/utils";

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

function Folder({folder, allFolders, selectedFolder, setSelectedFolder, indent, isExpanded, setIsExpanded}: {
  folder: FolderAndChild,
  allFolders: FolderAndChild[],
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
          `js-folder-${folder.id}`,
          "cursor-pointer select-none  w-full text-start",
          INDENTS[indent],
          selectedFolder?.id === folder.id ? "bg-gray-500" : "hover:bg-gray-600",
        )}
        title={JSON.stringify(folder)}
        onClick={() => setSelectedFolder(folder)}
        onKeyDown={(ev) => {
          let current: FolderAndChild | null = null;

          function find(tagetId: number, fs: FolderAndChild[]): FolderAndChild | null {
            for (const f of fs) {
              if (f.id === tagetId) return f;
              if (f.childFolders) {
                const found = find(tagetId, f.childFolders);
                if (found) return found;
              }
            }
            return null;
          }
          function findPrev(target: FolderAndChild, fs: FolderAndChild[]): FolderAndChild | null {
            for (const f of fs) {
              // targetが見つかったら、その一つ前の要素を返す。
              if (f === target) return current;
              // currentを更新する。
              current = f;
              // 子フォルダーありでopen状態なら、その中を探す。
              if (f.childFolders && isExpanded(f.id)) {
                const found = findPrev(target, f.childFolders);
                if (found) return found;
              }
            }
            return null;
          }

          function findNext(target: FolderAndChild, fs: FolderAndChild[]): FolderAndChild | null {
            // 逆から調べていく。
            for (let i = fs.length - 1; i >= 0; i--) {
              const f = fs[i];
              // 子フォルダーありでopen状態なら、その中を探す。
              if (f.childFolders && isExpanded(f.id)) {
                const found = findNext(target, f.childFolders);
                if (found) return found;
              }
              // targetが見つかったら、その一つ次の要素を返す。
              if (f === target) return current;
              // currentを更新する。
              current = f;
            }
            return null;
          }

          // 上下キーなら選択を移動する。
          if (ev.key === "ArrowUp" || ev.key === "ArrowDown") {
            const target = ev.key === "ArrowUp" ?
              findPrev(folder, allFolders) :
              findNext(folder, allFolders);
            if (target) {
              ev.preventDefault();
              const el = document.getElementsByClassName(`js-folder-${target.id}`)[0];
              (el as HTMLElement)?.focus()
            }
          }
          // 左キーの場合
          if (ev.key === "ArrowLeft") {
            // 子フォルダーありでopen状態なら閉じる。
            if (hasChildren && isExpanded(folder.id)) {
              setIsExpanded(folder.id, false);
              ev.preventDefault();
            }
            // 親フォルダーを選択する。
            else if (folder.parentFolderId != null) {
              const parent = find(folder.parentFolderId, allFolders);
              if (parent) {
                ev.preventDefault();
                const el = document.getElementsByClassName(`js-folder-${parent.id}`)[0];
                (el as HTMLElement)?.focus()
              }
            }
            // 前の要素を選択する。
            else {
              const prev = findPrev(folder, allFolders);
              if (prev) {
                ev.preventDefault();
                const el = document.getElementsByClassName(`js-folder-${prev.id}`)[0];
                (el as HTMLElement)?.focus()
              }
            }
          }
          // 右キーの場合
          if (ev.key === "ArrowRight") {
            // 子フォルダーありでclose状態なら開く。
            if (hasChildren && !isExpanded(folder.id)) {
              setIsExpanded(folder.id, true);
              ev.preventDefault();
            }
            // 次の要素を選択する。
            else {
              const next = findNext(folder, allFolders);
              if (next) {
                ev.preventDefault();
                const el = document.getElementsByClassName(`js-folder-${next.id}`)[0];
                (el as HTMLElement)?.focus()
              }
            }
          }
        }}
        onContextMenu={(ev) => {
          setShowMenu(!showMenu);
          ev.preventDefault();
        }}
      >
        {/*サブフォルダー展開ボタン*/}
        <button className={classNames(
          "hover:bg-gray-500 w-5",
          {"hidden": !hasChildren}
        )} onClick={(ev) => {
          setIsExpanded(folder.id, !isExpanded(folder.id));
          ev.stopPropagation();
        }}>
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
                    allFolders={allFolders}
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
export default function SideBar({onCreateNewNote, saveChanges}: {
  onCreateNewNote: () => void,
  saveChanges: () => void,
}) {
  const {data} = useFoldersAll();
  const [selectedFolder, setSelectedFolder] = useRecoilState(atoms.selectedFolder);
  const [[changedNotes], setChangedNotes] = useRecoilState(atoms.changedNotes);
  const [showSideBar, setShowSideBar] = useRecoilLocalStorage(atoms.showSideBar);
  const [isExpanded, setIsExpanded] = useLocalStorage<{
    [key: number]: boolean
  }>("SideBar.folders.isExpanded", {});

  // ページ離脱時に、変更されたノートがあれば保存確認を行う。
  const onBeforeUnload = useCallback((ev: BeforeUnloadEvent) => {
    if (changedNotes.size === 0) return;
    ev.preventDefault();
    ev.returnValue = "unsaved changes";
  }, [changedNotes]);
  useEffect(() => {
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [onBeforeUnload]);


  const {folders, trash} = data ?? {folders: [], trash: null};
  return (
    <div className={classNames('p-0.5 flex-none flex flex-col w-72 bg-gray-700 text-white',
      {'hidden': !showSideBar}
      )}>
      {/*固定ヘッダー*/}
      <div>
        <div className="m-1">
          <button className="rounded bg-gray-500 p-2 hover:bg-gray-400 w-full"
                  onClick={onCreateNewNote}>
            ノート新規作成
          </button>
        </div>
        <div className="m-1">
          <button className={classNames(
            "rounded p-2 w-full",
            changedNotes.size === 0 ? "bg-gray-900" : "bg-gray-500 hover:bg-gray-400"
            )}
                  onClick={saveChanges}>
            同期 ({changedNotes.size})
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
