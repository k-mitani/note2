import {useSetting} from "@/app/home/components/Setting/state";
import * as utils from "@/app/utils";
import {mutate} from "swr";
import {useLocalPrefs} from "@/app/home/useLocalPrefs";
import {useState} from "react";

export function SettingView() {
  const autoSave = useLocalPrefs(state => state.autoSave);
  const setAutoSave = useLocalPrefs(state => state.setAutoSave);
  const isOpen = useSetting(state => state.isOpen);
  const close = useSetting(state => state.close);

  const [key, setKey] = useState("");
  const [expiration, setExpiration] = useState(600);
  const [message, setMessage] = useState("");

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
         onMouseDown={(ev) => {
           if (ev.target === ev.currentTarget) close();
         }}>
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 rounded-lg p-6 pt-3 w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto">
        <h1 className="text-2xl">Settings</h1>

        {/* フォルダーロック */}
        <form className="mt-4" onSubmit={async (ev) => {
          ev.preventDefault();
          setMessage("sending...");
          const res = await utils.putJson("/api/rpc/setFolderKey", {key, expiration});
          setMessage(await res.text());
          setKey("");
          await Promise.all([
            mutate('/api/rpc/getFoldersAll'),
            mutate('/api/bookmarks'),
          ]);
        }}>
          <h2 className="text-lg pb-2">Folder Unlock</h2>
          <label className="flex items-center mb-2">
            <span className="w-20">Key</span>
            <input type="password"
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
