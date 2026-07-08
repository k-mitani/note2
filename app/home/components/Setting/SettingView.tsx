import {useSetting} from "@/app/home/components/Setting/state";
import * as utils from "@/app/utils";
import {mutate} from "swr";
import {useLocalPrefs} from "@/app/home/useLocalPrefs";
import {useState} from "react";
import {apiFor, useRemoteStore, useRemoteServers} from "@/app/home/remote";

export function SettingView() {
  const autoSave = useLocalPrefs(state => state.autoSave);
  const setAutoSave = useLocalPrefs(state => state.setAutoSave);
  const isOpen = useSetting(state => state.isOpen);
  const close = useSetting(state => state.close);
  const activeServer = useRemoteStore(state => state.activeServer);
  const {data: remoteServers, mutate: mutateRemoteServers} = useRemoteServers();

  // ロック解除の対象サーバー（""ならローカル）。表示中のサーバーを初期値にする。
  const [unlockTarget, setUnlockTarget] = useState<string>(activeServer?.id ?? "");
  const [key, setKey] = useState("");
  const [expiration, setExpiration] = useState(600);
  const [message, setMessage] = useState("");

  const [newServerName, setNewServerName] = useState("");
  const [newServerUrl, setNewServerUrl] = useState("");
  const [serversMessage, setServersMessage] = useState("");

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
         onMouseDown={(ev) => {
           if (ev.target === ev.currentTarget) close();
         }}>
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 rounded-lg p-6 pt-3 w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto">
        <h1 className="text-2xl">Settings</h1>

        {/* フォルダーロック（対象サーバーを選んで解除できる） */}
        <form className="mt-4" onSubmit={async (ev) => {
          ev.preventDefault();
          setMessage("sending...");
          const targetId = unlockTarget === "" ? null : unlockTarget;
          const res = await utils.putJson(apiFor(targetId, "/api/rpc/setFolderKey"), {key, expiration});
          setMessage(await res.text());
          setKey("");
          await Promise.all([
            mutate(apiFor(targetId, '/api/rpc/getFoldersAll')),
            mutate(apiFor(targetId, '/api/bookmarks')),
            mutateRemoteServers(),
          ]);
        }}>
          <h2 className="text-lg pb-2">Folder Unlock</h2>
          <label className="flex items-center mb-2">
            <span className="w-20">Server</span>
            <select
              className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-200 rounded-md ml-2 p-1 w-80"
              value={unlockTarget}
              onChange={ev => setUnlockTarget(ev.target.value)}>
              <option value="">ローカル</option>
              {(remoteServers?.servers ?? []).map(server => (
                <option key={server.id} value={server.id}>{server.name}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center mb-2">
            <span className="w-20">Key</span>
            <input type="password" name="password" autoComplete="current-password"
                   className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-200 rounded-md ml-2 p-1 w-80"
                   value={key}
                   onChange={ev => setKey(ev.target.value)}/>
          </label>
          <label className="flex items-center">
            <span className="w-20">Expiration</span>
            <input type="number"
                   className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-200 rounded-md ml-2 p-1 w-80"
                   value={expiration}
                   onChange={ev => setExpiration(parseInt(ev.target.value) || 0)}/>
          </label>
          <button type="submit" className="mt-4 bg-blue-500 text-white rounded-md p-2 w-20 hover:bg-blue-400">
            Set
          </button>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{message}</p>
        </form>

        {/* リモートサーバー登録（ローカルのロック解除状態でのみ表示） */}
        {remoteServers?.unlocked === true && <div className="mt-4">
          <h2 className="text-lg pb-2">Remote Servers</h2>
          <ul>
            {remoteServers.servers.map(server => (
              <li key={server.id} className="flex items-center mb-1">
                <span className="w-40 truncate">{server.name}</span>
                <span className="flex-1 truncate text-sm text-gray-500 dark:text-gray-400">{server.url}</span>
                <button className="ml-2 text-sm text-red-500 hover:text-red-400"
                        onClick={async () => {
                          if (!window.confirm(`「${server.name}」を削除しますか?`)) return;
                          const servers = remoteServers.servers.filter(s => s.id !== server.id);
                          const res = await utils.putJson("/api/rpc/remoteServers", {servers});
                          setServersMessage(res.ok ? "" : `削除に失敗しました (${res.status})`);
                          await mutateRemoteServers();
                        }}>
                  削除
                </button>
              </li>
            ))}
            {remoteServers.servers.length === 0 &&
              <li className="text-sm text-gray-500 dark:text-gray-400">未登録</li>}
          </ul>
          <form className="mt-2 flex items-center" onSubmit={async (ev) => {
            ev.preventDefault();
            const servers = [...remoteServers.servers, {
              id: crypto.randomUUID(),
              name: newServerName,
              url: newServerUrl,
            }];
            const res = await utils.putJson("/api/rpc/remoteServers", {servers});
            if (res.ok) {
              setNewServerName("");
              setNewServerUrl("");
              setServersMessage("");
            } else {
              setServersMessage(`登録に失敗しました (${res.status})`);
            }
            await mutateRemoteServers();
          }}>
            <input className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 rounded-md p-1 w-40"
                   placeholder="名称" value={newServerName} required
                   onChange={ev => setNewServerName(ev.target.value)}/>
            <input className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 rounded-md ml-2 p-1 flex-1"
                   type="url" placeholder="https://..." value={newServerUrl} required
                   onChange={ev => setNewServerUrl(ev.target.value)}/>
            <button type="submit" className="ml-2 bg-blue-500 text-white rounded-md p-1 px-3 hover:bg-blue-400">
              追加
            </button>
          </form>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{serversMessage}</p>
        </div>}

        {/* その他 */}
        <div className="mt-4">
          <h2 className="text-lg pb-2">Others</h2>
          <button className="ms-1 text-sm" onClick={() => setAutoSave(!autoSave)}>
            <input className="align-middle" type="checkbox" checked={autoSave} readOnly/>
            <span className="align-middle">自動保存</span>
          </button>
        </div>

      </div>
    </div>
  );
}
