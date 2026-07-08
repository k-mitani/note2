import {useCallback, useEffect, useRef, useState} from "react";
import classNames from "classnames";
import useSWR from "swr";
import {FaServer} from "react-icons/fa6";
import type {Note} from "@/app/generated/prisma/browser";
import {findFolderById} from "@/lib/folderTree";
import {apiFor, RemoteServer, getRemoteAuth, setRemoteAuth, useRemoteStore} from "@/app/home/remote";
import {SectionBookmarks} from "@/app/home/components/FolderList/SectionBookmarks";
import {useNote} from "@/app/home/state";
import {useSearch, useSearchStore} from "@/app/home/search";
import {useFoldersAllFor, useOnDropToFolder} from "@/app/home/hooks";
import {useLocalPrefs} from "@/app/home/useLocalPrefs";
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
  // 展開状態はローカル設定に永続化し、リロード後に自動再接続して復元する。
  const expanded = useLocalPrefs(state => state.remoteExpandedDict[server.id] ?? false);
  const setRemoteExpanded = useLocalPrefs(state => state.setRemoteExpanded);
  const setExpanded = useCallback((value: boolean) =>
    setRemoteExpanded(server.id, value), [server.id, setRemoteExpanded]);
  const [authOpen, setAuthOpen] = useState(false);
  const [authUser, setAuthUser] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [message, setMessage] = useState("");

  // 接続済みの間だけフォルダーツリーとブックマークを取得する。
  const {data} = useFoldersAllFor(server.id, connected);
  const folders = data?.folders ?? [];
  const trash = data?.trash ?? null;
  const {data: bookmarks = []} = useSWR<Note[]>(
    connected ? apiFor(server.id, '/api/bookmarks') : null, utils.jsonFetcher);

  const selectedFolder = useNote(state => state.selectedFolder);
  const setSelectedFolder = useNote(state => state.setSelectedFolder);
  const onDropToFolder = useOnDropToFolder(selectedFolder?.id);
  const {active: searchActive, folderCounts} = useSearch();
  const setViewingResults = useSearchStore(state => state.setViewingResults);

  // フォルダー開閉状態。ローカルのフォルダーIDと衝突しないようサーバーIDで名前空間を分けて永続化する。
  const remoteFoldingDict = useLocalPrefs(state => state.remoteFoldingDict);
  const setRemoteFolding = useLocalPrefs(state => state.setRemoteFolding);

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
  }, [server.id, setExpanded]);

  // リロード後、展開状態が保存されていたら自動で再接続する。
  // （BASIC認証情報はsessionStorageにあるためリロードでは失われない。）
  const autoConnectTried = useRef(false);
  useEffect(() => {
    if (!expanded || connected || autoConnectTried.current) return;
    autoConnectTried.current = true;
    connect();
  }, [expanded, connected, connect]);

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

  // 表示対象サーバーが違えばこのサーバーに切り替える。キャンセルしたらfalseを返す。
  const switchToThisServer = (): boolean => {
    if (isActive) return true;
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
    return true;
  };

  // このサーバーのフォルダーを選択する。
  // 切替をキャンセルした場合はfalseを返す（コンテキストメニューの誤爆防止）。
  const selectFolder = (folder: FolderAndChild): boolean | void => {
    if (!switchToThisServer()) return false;
    setViewingResults(false);
    setSelectedFolder(folder as any);
  };

  const selectBookmark = (note: Note) => {
    if (!switchToThisServer()) return;
    setViewingResults(false);
    const {setSelectedNote} = useNote.getState();
    setSelectedNote(note);
    if (note.folderId) {
      const folder = findFolderById(note.folderId, folders);
      if (folder) {
        setSelectedFolder(folder as any);
      }
    }
  };

  const common: FolderCommonProps = {
    // ドロップ操作は表示対象サーバーが一致しているときだけ受け付ける
    // （別サーバーのノート/フォルダーを誤って移動しないため）。
    onDrop: isActive ? onDropToFolder : () => {},
    allFolders: folders,
    selectedFolder: isActive ? (selectedFolder as any) : undefined,
    setSelectedFolder: selectFolder,
    isFolding: (id: number) => remoteFoldingDict[`${server.id}:${id}`] ?? true,
    setFolding: (id: number, fold: boolean) =>
      setRemoteFolding(`${server.id}:${id}`, fold),
    searchActive: isActive && searchActive,
    searchCounts: folderCounts,
  };

  return (
    <div className="mt-2">
      {/*セクションヘッダー*/}
      <button
        className={classNames(
          "w-full text-start text-sm md:text-base h-7 flex items-center px-1 rounded select-none hover:bg-gray-600",
          isActive && "font-bold",
        )}
        onDoubleClick={onHeaderDoubleClick}
      >
        <FaServer className="inline mr-1 text-gray-400"/>
        <span className="line-clamp-1">{server.name}</span>
        <span className="text-gray-500 ml-1">
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
          {/*ショートカット（このサーバーのブックマーク）*/}
          <SectionBookmarks
            bookmarks={bookmarks}
            folded={remoteFoldingDict[`${server.id}:bookmarks`] ?? false}
            setFolded={(folded) => setRemoteFolding(`${server.id}:bookmarks`, folded)}
            onSelect={selectBookmark}
          />
          <ul>
            {folders.map(folder => (
              <li key={folder.id}>
                <Folder folder={folder} indent={0} common={common}/>
              </li>
            ))}
          </ul>
          {trash && (
            <ul>
              <li key={trash.id}>
                <Folder folder={trash} indent={0} common={common}/>
              </li>
            </ul>
          )}
        </>
      )}
    </div>
  );
}
