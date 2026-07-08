import {useCallback, useState} from "react";
import classNames from "classnames";
import {FaServer} from "react-icons/fa6";
import {RemoteServer, getRemoteAuth, setRemoteAuth, useRemoteStore} from "@/app/home/remote";
import {useNote} from "@/app/home/state";
import {useSearch, useSearchStore} from "@/app/home/search";
import {useFoldersAllFor, useOnDropToFolder} from "@/app/home/hooks";
import {Folder, FolderAndChild, FolderCommonProps} from "@/app/home/components/FolderList/Folder";
import * as utils from "@/app/utils";

/**
 * サイドバー下部に表示するリモートサーバーのセクション。
 * ヘッダーをダブルクリックすると接続確認を行い（401ならBASIC認証の入力を求める）、
 * 接続できたらそのサーバーのフォルダーツリーをローカルと同じ見た目でインライン展開する。
 * フォルダーをクリックすると表示対象サーバーがそのサーバーに切り替わる。
 */
export function RemoteServerSection({server}: { server: RemoteServer }) {
  const activeServer = useRemoteStore(state => state.activeServer);
  const setActiveServer = useRemoteStore(state => state.setActiveServer);
  const isActive = activeServer?.id === server.id;

  const [connected, setConnected] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authUser, setAuthUser] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [message, setMessage] = useState("");

  // 接続済みの間だけフォルダーツリーを取得する。
  const {data} = useFoldersAllFor(server.id, connected);
  const folders = data?.folders ?? [];
  const trash = data?.trash ?? null;

  const selectedFolder = useNote(state => state.selectedFolder);
  const setSelectedFolder = useNote(state => state.setSelectedFolder);
  const onDropToFolder = useOnDropToFolder(selectedFolder?.id);
  const {active: searchActive, folderCounts} = useSearch();
  const setViewingResults = useSearchStore(state => state.setViewingResults);

  // フォルダー開閉状態。ローカルのフォルダーIDと衝突しないようセクション内で保持する。
  const [foldingDict, setFoldingDict] = useState<{ [id: number]: boolean }>({});

  // 接続確認。401ならBASIC認証入力へ、成功なら展開する。
  const connect = useCallback(async () => {
    setMessage("接続確認中...");
    let res: Response;
    try {
      res = await utils.apiFetch(`/api/remote/${server.id}/api/rpc/getFoldersAll`);
    } catch {
      setMessage("接続に失敗しました");
      return;
    }
    if (res.status === 401) {
      setMessage(getRemoteAuth(server.id) == null ? "" : "認証に失敗しました");
      setAuthOpen(true);
      return;
    }
    if (!res.ok) {
      setMessage(`接続に失敗しました (${res.status})`);
      return;
    }
    setMessage("");
    setAuthOpen(false);
    setAuthPassword("");
    setConnected(true);
    setExpanded(true);
  }, [server.id]);

  const onHeaderDoubleClick = useCallback(() => {
    if (expanded) {
      setExpanded(false);
      setAuthOpen(false);
      setMessage("");
    } else if (connected) {
      setExpanded(true);
    } else {
      connect();
    }
  }, [expanded, connected, connect]);

  const submitAuth = useCallback(async (ev: React.FormEvent) => {
    ev.preventDefault();
    setRemoteAuth(server.id, authUser, authPassword);
    await connect();
  }, [server.id, authUser, authPassword, connect]);

  // このサーバーのフォルダーを選択する。表示対象サーバーが違えば切り替える。
  // 切替をキャンセルした場合はfalseを返す（コンテキストメニューの誤爆防止）。
  const selectFolder = (folder: FolderAndChild): boolean | void => {
    if (!isActive) {
      const {changedNotes, clearChangedNotes, setSelectedNote} = useNote.getState();
      if (changedNotes.size > 0 &&
        !window.confirm("未保存の変更があります。破棄してサーバーを切り替えますか?")) {
        return false;
      }
      clearChangedNotes();
      setSelectedNote(null);
      const search = useSearchStore.getState();
      search.setInput("");
      search.setQuery("");
      search.setViewingResults(false);
      setActiveServer(server);
    }
    setViewingResults(false);
    setSelectedFolder(folder as any);
  };

  const common: FolderCommonProps = {
    // ドロップ操作は表示対象サーバーが一致しているときだけ受け付ける
    // （別サーバーのノート/フォルダーを誤って移動しないため）。
    onDrop: isActive ? onDropToFolder : () => {},
    allFolders: folders,
    selectedFolder: isActive ? (selectedFolder as any) : undefined,
    setSelectedFolder: selectFolder,
    isFolding: (id: number) => foldingDict[id] ?? true,
    setFolding: (id: number, fold: boolean) =>
      setFoldingDict(dict => ({...dict, [id]: fold})),
    searchActive: isActive && searchActive,
    searchCounts: folderCounts,
  };

  return (
    <div className="mt-2">
      {/*セクションヘッダー*/}
      <button
        className={classNames(
          "w-full text-start text-sm md:text-base h-7 flex items-center px-1 rounded select-none",
          isActive ? "bg-gray-500 dark:bg-gray-700" : "hover:bg-gray-600",
        )}
        title={`${server.name}（ダブルクリックで${expanded ? "折りたたみ" : "接続/展開"}）`}
        onDoubleClick={onHeaderDoubleClick}
      >
        <FaServer className="inline mr-1 text-gray-400"/>
        <span className="line-clamp-1 flex-1">{server.name}</span>
        <span className="text-gray-500 w-5 ml-1 ps-0.5 pe-0.5">
          {expanded ? "▼" : "▶"}
        </span>
      </button>

      {/*BASIC認証フォーム*/}
      {authOpen && (
        <form className="px-2 py-1" onSubmit={submitAuth}>
          <div className="text-sm mb-1">{server.name} のBASIC認証</div>
          <input className="w-full mb-1 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm"
                 name="username" autoComplete="username"
                 placeholder="ユーザー名" value={authUser} autoFocus
                 onChange={ev => setAuthUser(ev.target.value)}/>
          <input className="w-full mb-1 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm"
                 type="password" name="password" autoComplete="current-password"
                 placeholder="パスワード" value={authPassword}
                 onChange={ev => setAuthPassword(ev.target.value)}/>
          <button type="submit"
                  className="rounded bg-blue-600 hover:bg-blue-500 px-2 py-1 text-sm">
            接続
          </button>
        </form>
      )}
      {message !== "" && <div className="px-2 py-1 text-sm text-orange-300">{message}</div>}

      {/*フォルダーツリー*/}
      {expanded && connected && (
        <>
          <ul>
            {folders.map(folder => (
              <li key={folder.id}>
                <Folder folder={folder} indent={1} common={common}/>
              </li>
            ))}
          </ul>
          {trash && (
            <ul>
              <li key={trash.id}>
                <Folder folder={trash} indent={1} common={common}/>
              </li>
            </ul>
          )}
        </>
      )}
    </div>
  );
}
