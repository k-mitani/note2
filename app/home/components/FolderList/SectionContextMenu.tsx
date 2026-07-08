import {useState} from "react";
import {mutate} from "swr";
import * as utils from "@/app/utils";
import {PopupMenu, PopupMenuItem} from "@/app/home/components/PopupMenu";
import {apiFor} from "@/app/home/remote";

// アンロック有効期限の初期値（秒）。旧・設定画面の既定値を踏襲する。
const DEFAULT_UNLOCK_EXPIRATION_SECONDS = 600;

/**
 * サイドバーのセクションヘッダー（ローカルの「Home」／各リモートサーバー）を
 * 右クリックしたときに表示するメニュー。
 * ここでフォルダーロックのアンロック（キー入力）を行う。
 * 対象サーバーは右クリックしたセクションで決まる（serverId が null ならローカル）。
 */
export function SectionContextMenu(
  {serverId, serverName, x, y, onClose}: {
    serverId: string | null,
    serverName: string,
    x: number,
    y: number,
    onClose: () => void,
  }) {
  // アンロック入力フォームを表示中ならtrue（メニューの代わりにフォームを出す）。
  const [unlockOpen, setUnlockOpen] = useState(false);

  // 対象サーバーのロック関連キャッシュを再取得する。
  const refresh = () => Promise.all([
    mutate(apiFor(serverId, '/api/rpc/getFoldersAll')),
    mutate(apiFor(serverId, '/api/bookmarks')),
    // ローカルのアンロック状態（remoteServers.unlocked）も更新する。
    mutate('/api/rpc/remoteServers'),
  ]);

  if (unlockOpen) {
    return <UnlockDialog
      serverId={serverId}
      serverName={serverName}
      x={x}
      y={y}
      onDone={refresh}
      onClose={onClose}
    />;
  }

  return <PopupMenu x={x} y={y} onClose={onClose}>
    {/* メニューは閉じずにフォームへ切り替える。 */}
    <PopupMenuItem label="アンロック" onClick={() => setUnlockOpen(true)}/>
  </PopupMenu>;
}

/**
 * アンロックキーと有効期限を入力するポップアップ。再ロックもここから行う。
 * 位置決め・外側クリック/Escで閉じる挙動は PopupMenu を再利用する。
 */
function UnlockDialog(
  {serverId, serverName, x, y, onDone, onClose}: {
    serverId: string | null,
    serverName: string,
    x: number,
    y: number,
    onDone: () => Promise<unknown>,
    onClose: () => void,
  }) {
  const [key, setKey] = useState("");
  const [expiration, setExpiration] = useState(DEFAULT_UNLOCK_EXPIRATION_SECONDS);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const inputClass = "w-full rounded-md border border-gray-300 dark:border-gray-700 " +
    "bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-200 px-2 py-1 text-sm";

  // キー設定（アンロック）／破棄（再ロック）を送信する。
  const apply = async (payload: { key: string, expiration: number }) => {
    setSending(true);
    setMessage("送信中...");
    let res: Response;
    try {
      res = await utils.putJson(apiFor(serverId, "/api/rpc/setFolderKey"), payload);
    } catch {
      setMessage("送信に失敗しました");
      setSending(false);
      return;
    }
    if (!res.ok) {
      setMessage(`失敗しました (${res.status})`);
      setSending(false);
      return;
    }
    await onDone();
    onClose();
  };

  return <PopupMenu x={x} y={y} onClose={onClose}>
    <form className="p-2 w-56" onSubmit={ev => {
      ev.preventDefault();
      apply({key, expiration});
    }}>
      <div className="mb-1 text-sm font-bold">{serverName} のアンロック</div>
      <input
        type="password" name="password" autoComplete="current-password"
        className={`${inputClass} mb-1`}
        placeholder="キー" value={key} autoFocus
        onChange={ev => setKey(ev.target.value)}/>
      <label className="mb-2 flex items-center">
        <span className="w-24 text-sm">有効期限(秒)</span>
        <input
          type="number" min={0}
          className={inputClass}
          value={expiration}
          onChange={ev => setExpiration(parseInt(ev.target.value) || 0)}/>
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={sending}
                className="flex-1 rounded-md bg-blue-500 hover:bg-blue-400 disabled:opacity-50 px-2 py-1 text-sm text-white">
          アンロック
        </button>
        {/* キーを破棄してロック状態に戻す。 */}
        <button type="button" disabled={sending}
                onClick={() => apply({key: "", expiration: 0})}
                className="rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 px-2 py-1 text-sm">
          再ロック
        </button>
      </div>
      {message !== "" && <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</div>}
    </form>
  </PopupMenu>;
}
