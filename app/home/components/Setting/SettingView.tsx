import {useSetting} from "@/app/home/components/Setting/state";
import {parseIni} from "@smithy/shared-ini-file-loader/dist-types/parseIni";
import * as utils from "@/app/utils";
import {mutate} from "swr";

export function SettingView() {
  const isOpen = useSetting(state => state.isOpen);
  const close = useSetting(state => state.close);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
         onMouseDown={(ev) => {
           if (ev.target === ev.currentTarget) close();
         }}>
      <div className="bg-white rounded-lg p-6 pt-3 w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto">
        <h1 className="text-2xl">Settings</h1>

        <div className="mt-4">
          <h2 className="text-lg pb-2">Folder Lock</h2>
          <label className="flex items-center mb-2">
            <span className="w-20">Key</span>
            <input id="setting-key" type="password" className="border border-gray-300 rounded-md ml-2 p-1 w-80"/>
          </label>
          <label className="flex items-center">
            <span className="w-20">Expiration</span>
            <input id="setting-expiration" defaultValue={600} type="number" className="border border-gray-300 rounded-md ml-2 p-1 w-80"/>
          </label>
          <button
            className="mt-4 bg-blue-500 text-white rounded-md p-2 w-20 hover:bg-blue-400"
            onClick={async () => {
              const key = (document.getElementById("setting-key") as HTMLInputElement).value;
              const expiration = parseInt((document.getElementById("setting-expiration") as HTMLInputElement).value);
              const res = await utils.putJson("/api/rpc/setFolderKey", {key, expiration});

              const message = document.getElementById("setting-message")!;
              message.textContent = await res.text();
              await mutate('/api/rpc/getFoldersAll');
            }}>
            Set
          </button>
          <p id="setting-message" className="text-sm text-gray-500 mt-2"></p>
        </div>
      </div>
    </div>
  );
}