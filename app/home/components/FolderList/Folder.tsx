import type {Folder, Note} from "@/app/generated/prisma/browser";
import {useDrag, useDrop} from "react-dnd";
import {useState} from "react";
import classNames from "classnames";
import {FolderContextMenu} from "@/app/home/components/FolderList/FolderContextMenu";
import {FaLockOpen} from "react-icons/fa6";
import {FOLDER_INDENT_CLASSES} from "@/app/home/constants";
import {findFolderById, findNextFolder, findPrevFolder} from "@/lib/folderTree";

export type FolderAndChild = Folder & { childFolders: FolderAndChild[], _count?: { notes: number } };

export type FolderCommonProps = {
  onDrop: (ev: { target: Folder, notes: Note[] | null, folders: Folder[] | null }) => void,
  allFolders: FolderAndChild[],
  selectedFolder: FolderAndChild | undefined,
  setSelectedFolder: (folder: FolderAndChild) => void,
  isFolding: (id: number) => boolean,
  setFolding: (id: number, expand: boolean) => void,
  // 全フォルダー横断検索が有効なときは、フォルダーごとの件数を検索ヒット数に置き換える。
  searchActive: boolean,
  searchCounts: Record<string, number> | undefined,
};

/** id付きフォルダー要素にフォーカスする。 */
function focusFolder(id: number) {
  const el = document.getElementById(`folder-${id}`);
  el?.focus();
}

export function Folder({folder, indent, common}: {
  folder: FolderAndChild,
  indent: number,
  common: FolderCommonProps,
}) {
  const {onDrop, allFolders, selectedFolder, setSelectedFolder, isFolding, setFolding} = common;

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
  const [menuPos, setMenuPos] = useState<{ x: number, y: number } | null>(null);
  const hasChildren = (folder.childFolders?.length ?? 0) > 0;
  // 検索中はそのフォルダー直下のヒット数を、通常時は全ノート数を表示する。
  const noteCount = common.searchActive
    ? (common.searchCounts?.[String(folder.id)] ?? 0)
    : (folder._count?.notes ?? 0);
  const indentClass = FOLDER_INDENT_CLASSES[Math.min(indent, FOLDER_INDENT_CLASSES.length - 1)];

  const openMenuFromTwoFingerTap = (ev: React.TouchEvent<HTMLButtonElement>) => {
    if (ev.touches.length !== 2) return;

    const [first, second] = [ev.touches[0], ev.touches[1]];
    ev.preventDefault();
    ev.stopPropagation();
    setMenuPos({
      x: (first.clientX + second.clientX) / 2,
      y: (first.clientY + second.clientY) / 2,
    });
  };

  return (
    <div>
      {/*フォルダー項目*/}
      <button
        ref={refDrop as any}
        id={`folder-${folder.id}`}
        className={classNames(
          "cursor-pointer select-none w-full text-start h-7 flex items-center",
          indentClass,
          {
            "bg-blue-300": isOver,
            "bg-cyan-500": isDragging,
          },
          selectedFolder?.id === folder.id ? "bg-gray-500 dark:bg-gray-700" : "hover:bg-gray-600",
        )}
        onClick={() => setSelectedFolder(folder)}
        onDoubleClick={(ev) => {
          setFolding(folder.id, !isFolding(folder.id));
          ev.stopPropagation();
        }}
        onKeyDown={(ev) => {
          // 上下キーなら選択を移動する。
          if (ev.key === "ArrowUp" || ev.key === "ArrowDown") {
            const target = ev.key === "ArrowUp" ?
              findPrevFolder(folder, allFolders, isFolding) :
              findNextFolder(folder, allFolders, isFolding);
            if (target) {
              ev.preventDefault();
              focusFolder(target.id);
            }
          }
          // 左キーの場合
          if (ev.key === "ArrowLeft") {
            // 子フォルダーありでopen状態なら閉じる。
            if (hasChildren && !isFolding(folder.id)) {
              setFolding(folder.id, true);
              ev.preventDefault();
            }
            // 親フォルダーを選択する。
            else if (folder.parentFolderId != null) {
              const parent = findFolderById(folder.parentFolderId, allFolders);
              if (parent) {
                ev.preventDefault();
                focusFolder(parent.id);
              }
            }
            // 前の要素を選択する。
            else {
              const prev = findPrevFolder(folder, allFolders, isFolding);
              if (prev) {
                ev.preventDefault();
                focusFolder(prev.id);
              }
            }
          }
          // 右キーの場合
          if (ev.key === "ArrowRight") {
            // 子フォルダーありでclose状態なら開く。
            if (hasChildren && isFolding(folder.id)) {
              setFolding(folder.id, false);
              ev.preventDefault();
            }
            // 次の要素を選択する。
            else {
              const next = findNextFolder(folder, allFolders, isFolding);
              if (next) {
                ev.preventDefault();
                focusFolder(next.id);
              }
            }
          }
        }}
        onContextMenu={(ev) => {
          ev.preventDefault();
          setMenuPos({x: ev.clientX, y: ev.clientY});
        }}
        onTouchStart={openMenuFromTwoFingerTap}
      >
        {/*フォルダー名*/}
        <div className="text-sm md:text-base line-clamp-1"
             ref={refDrag as any}>
          {folder.name}
          {noteCount !== 0 && <span className="text-gray-400">
            &nbsp;({noteCount})
          </span>}
          {folder.isLocked && (<FaLockOpen className="pl-1 inline text-gray-400" />)}
        </div>

        {/*サブフォルダー展開ボタン*/}
        <div className={classNames(
          "w-5 ml-1 ps-0.5 pe-0.5",
          {"hidden": !hasChildren},
          selectedFolder?.id === folder.id ? "text-gray-400" : "text-gray-500",
        )}>
          {isFolding(folder.id) ? "▶" : "▼"}
        </div>
      </button>

      {/*コンテキストメニュー*/}
      {menuPos && (
        <FolderContextMenu
          folder={folder}
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setMenuPos(null)}
        />
      )}

      {/*サブフォルダー*/}
      {folder.childFolders && <ul className={classNames({hidden: isFolding(folder.id)})}>
        {folder.childFolders.map(subFolder => {
          return <li key={subFolder.id}>
            <Folder folder={subFolder} indent={indent + 1} common={common}/>
          </li>
        })}
      </ul>}
    </div>
  );
}
