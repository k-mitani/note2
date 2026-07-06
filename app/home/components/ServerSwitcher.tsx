import {useCallback, useState} from "react";
import {FaServer} from "react-icons/fa6";
import classNames from "classnames";
import {RemoteServer, getRemoteAuth, setRemoteAuth, useRemoteStore, useRemoteServers} from "@/app/home/remote";
import {useNote} from "@/app/home/state";
import {useSearchStore} from "@/app/home/search";
import * as utils from "@/app/utils";

/**
 * トップバーのサーバー切替ボタン。ポップアップからローカル/リモートサーバーを選ぶ。
 * リモート選択時は接続確認を行い、401ならBASIC認証の入力を求める
 * （認証情報はsessionStorageに保存され、ブラウザセッション終了で消える）。
 */
export function ServerSwitcher() {
  const activeServer = useRemoteStore(state => state.activeServer);
  const setActiveServer = useRemoteStore(state => state.setActiveServer);
  const {data} = useRemoteServers();
  const servers = data?.servers ?? [];

  const [isOpen, setIsOpen] = useState(false);
  const [authTarget, setAuthTarget] = useState<RemoteServer | null>(null);
  const [authUser, setAuthUser] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [message, setMessage] = useState("");

  const closePopup = useCallback(() => {
    setIsOpen(false);
    setAuthTarget(null);
    setAuthUser("");
    setAuthPassword("");
    setMessage("");
  }, []);

  const activate = useCallback((server: RemoteServer | null) => {
    const {changedNotes, clearChangedNotes, setSelectedFolder, setSelectedNote} = useNote.getState();
    if (changedNotes.size > 0 &&
      !window.confirm("未保存の変更があります。破棄してサーバーを切り替えますか?")) {
      return;
    }
    clearChangedNotes();
    setSelectedFolder(null);
    setSelectedNote(null);
    const search = useSearchStore.getState();
    search.setInput("");
    search.setQuery("");
    search.setViewingResults(false);
    setActiveServer(server);
    closePopup();
  }, [setActiveServer, closePopup]);

  // 接続確認。401ならBASIC認証入力へ、成功なら切り替える。
  const trySelect = useCallback(async (server: RemoteServer) => {
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
      setAuthTarget(server);
      return;
    }
    if (!res.ok) {
      setMessage(`接続に失敗しました (${res.status})`);
      return;
    }
    activate(server);
  }, [activate]);

  const submitAuth = useCallback(async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (authTarget == null) return;
    setRemoteAuth(authTarget.id, authUser, authPassword);
    setAuthPassword("");
    await trySelect(authTarget);
  }, [authTarget, authUser, authPassword, trySelect]);

  return (
    <div className="relative">
      <button
        className={classNames("ms-1 rounded p-2 w-14 hover:bg-gray-400",
          activeServer == null ? "bg-gray-500 dark:bg-gray-700" : "bg-orange-600 dark:bg-orange-800")}
        title={activeServer == null ? "サーバー切替（ローカル）" : `サーバー切替（${activeServer.name}）`}
        onClick={() => isOpen ? closePopup() : setIsOpen(true)}>
        <FaServer className="m-auto"/>
      </button>

      {isOpen && <>
        <div className="fixed inset-0 z-40" onMouseDown={closePopup}/>
        <div className="absolute left-0 top-full mt-1 z-50 w-64 rounded border border-gray-600 bg-gray-700 dark:bg-neutral-800 text-white dark:text-gray-300 shadow-lg p-1">
          <button
            className={classNames("block w-full text-left rounded px-2 py-1 hover:bg-gray-600",
              activeServer == null && "bg-gray-800 dark:bg-neutral-900")}
            onClick={() => activate(null)}>
            ローカル
          </button>
          {servers.map(server => (
            <button key={server.id}
                    className={classNames("block w-full text-left rounded px-2 py-1 hover:bg-gray-600",
                      activeServer?.id === server.id && "bg-gray-800 dark:bg-neutral-900")}
                    onClick={() => trySelect(server)}>
              {server.name}
              <span className="block text-xs text-gray-400 truncate">{server.url}</span>
            </button>
          ))}
          {servers.length === 0 &&
            <div className="px-2 py-1 text-sm text-gray-400">リモートサーバー未登録</div>}

          {authTarget != null &&
            <form className="border-t border-gray-600 mt-1 pt-1 px-2 pb-1" onSubmit={submitAuth}>
              <div className="text-sm mb-1">{authTarget.name} のBASIC認証</div>
              <input className="w-full mb-1 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm"
                     placeholder="ユーザー名" value={authUser} autoFocus
                     onChange={ev => setAuthUser(ev.target.value)}/>
              <input className="w-full mb-1 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm"
                     type="password" placeholder="パスワード" value={authPassword}
                     onChange={ev => setAuthPassword(ev.target.value)}/>
              <button type="submit"
                      className="rounded bg-blue-600 hover:bg-blue-500 px-2 py-1 text-sm">
                接続
              </button>
            </form>}

          {message !== "" && <div className="px-2 py-1 text-sm text-orange-300">{message}</div>}
        </div>
      </>}
    </div>
  );
}
