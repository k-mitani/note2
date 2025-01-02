import {Folder, Note} from "@prisma/client";
import {useDrag, useDrop} from "react-dnd";
import {useState} from "react";
import {mutate} from "swr";
import classNames from "classnames";
import {FolderContextMenu} from "@/app/home/components/FolderList/FolderContextMenu";
import * as utils from "@/app/utils";
import {FaLockOpen} from "react-icons/fa6";

type FolderAndChild = Folder & { childFolders: FolderAndChild[] };

export type FolderCommonProps = {
  onDrop: (ev: { target: Folder, notes: Note[] | null, folders: Folder[] | null }) => void,
  allFolders: FolderAndChild[],
  selectedFolder: FolderAndChild | undefined,
  setSelectedFolder: (folder: FolderAndChild) => void,
  isExpanded: (id: number) => boolean,
  setIsExpanded: (id: number, expand: boolean) => void,
};

const INDENTS = [
  "ps-0",
  "ps-[0.625rem] md:ps-[1.25rem]",
  "ps-[1.25rem] md:ps-[2.5rem]",
  "ps-[1.875rem] md:ps-[3.75rem]",
  "ps-[2.5rem] md:ps-[5rem]",
  "ps-[3.125rem] md:ps-[6.25rem]"
];

export async function createFolder(parentFolderId: number | null) {
  const newName = prompt("名前を入力してください", "新しいフォルダー");
  if (newName == null) return;
  await utils.postJson(`/api/folders/${parentFolderId}/createFolder`, {name: newName});
  await mutate('/api/rpc/getFoldersAll');
}

export function Folder({folder, indent, common}: {
  folder: FolderAndChild,
  indent: number,
  common: FolderCommonProps,
}) {
  const {onDrop, allFolders, selectedFolder, setSelectedFolder, isExpanded, setIsExpanded} = common;

  const [{canDrop, isOver}, refDrop] = useDrop({
    accept: ["note", "folder"],
    drop: (item: {}) => onDrop({target: folder, ...item} as any),
    collect: (monitor) => ({
      canDrop: monitor.canDrop(),
      isOver: monitor.isOver(),
    }),
  });
  const [{isDragging}, refDrag] = useDrag(() => ({
    type: "folder",
    item: {folders: [folder]},
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
  }));
  const [showMenu, setShowMenu] = useState(false);
  const hasChildren = folder.childFolders?.length > 0 ?? false;

  return (
    <div onMouseLeave={() => setShowMenu(false)}>
      {/*フォルダー項目*/}
      <button
        ref={refDrop}
        className={classNames(
          `js-folder-${folder.id}`,
          "cursor-pointer select-none w-full text-start h-7 flex items-center",
          INDENTS[indent],
          {
            "bg-blue-300": isOver,
            "bg-cyan-500": isDragging,
          },
          selectedFolder?.id === folder.id ? "bg-gray-500 dark:bg-gray-700" : "hover:bg-gray-600",
        )}
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
        <div className={classNames(
          "hover:bg-gray-500 w-5 ps-0.5 pe-0.5",
          {"hidden": !hasChildren}
        )} onClick={(ev) => {
          setIsExpanded(folder.id, !isExpanded(folder.id));
          ev.stopPropagation();
        }}>
          {isExpanded(folder.id) ? "▼" : "▶"}
        </div>

        {/*フォルダー名*/}
        <div className="text-sm md:text-base line-clamp-1"
             ref={refDrag}>
          {folder.name}
          {(folder as any)._count.notes != 0 && <span className="text-gray-400">
            &nbsp;({(folder as any)._count.notes})
          </span>}
          {folder.isLocked && (<FaLockOpen className="pl-1 inline text-gray-400" />)}
        </div>
      </button>

      {/*コンテキストメニュー*/}
      {showMenu && FolderContextMenu(folder)}

      {/*サブフォルダー*/}
      {folder.childFolders && <ul className={classNames({hidden: !isExpanded(folder.id)})}>
        {folder.childFolders.map(subFolder => {
          return <li key={subFolder.id}>
            <Folder folder={subFolder} indent={indent + 1} common={common}/>
          </li>
        })}
      </ul>}
    </div>
  );
}