"use client";

import {useEffect, useRef, useState} from "react";
import {useNote} from "@/app/home/state";
import {useNoteList} from "@/app/home/components/NoteList/state";
import {useFoldersAll} from "@/app/home/hooks";
import {findFolderById} from "@/lib/folderTree";
import type {Note} from "@/app/generated/prisma/browser";
import {apiFor, RemoteServer, useRemoteStore} from "@/app/home/remote";
import {useLocalPrefs} from "@/app/home/useLocalPrefs";
import * as utils from "@/app/utils";

/**
 * ノートのパーマリンクと、ブラウザの戻る/進む（History API）を実装するフック。
 *
 * ルートは optional catch-all（`app/home/[[...slug]]/page.tsx`）で、`/home` と
 * `/home/...` が同一セグメントにマッチする。そのため URL 変更は生の History API
 * （pushState）だけで完結し、Next のルーティング（再マウント）が発生しない。
 *
 * URL 構造:
 * - ローカル: `/home` / `/home/<noteId>`
 * - リモート: `/home/r/<serverId>` / `/home/r/<serverId>/<noteId>`
 *   （リモートのノートIDはローカルと衝突しうるため、サーバーIDで名前空間を分ける。
 *    `r/` プレフィックスで先頭が数値のローカルURLと区別する。）
 *
 * - 選択中のノート／表示中のサーバーが変わると URL を push する（戻る/進むで履歴をたどれる）。
 * - 戻る/進む（popstate）時は URL から表示中サーバーとノートを復元する。
 * - 初回ロード時も同様に URL から復元する
 *   （所属フォルダーが分からないので、そのサーバーのフォルダーツリーで folderId を解決する）。
 *
 * タイトルは常に "note2" のままにする（プライバシー配慮）。document.title は一切変更しない。
 * pushState の第2引数（title）はブラウザに無視されるため、タイトルへの影響はない。
 */
const BASE_PATH = "/home";

type UrlLocation = { serverId: string | null, noteId: number | null };

// 純粋な数値セグメントのみノートIDとして受け付ける（"1abc" 等は弾く）。
function parseNoteId(seg: string | undefined): number | null {
  if (seg == null || seg === "") return null;
  const id = parseInt(seg, 10);
  return Number.isFinite(id) && String(id) === seg ? id : null;
}

/** 現在のURLから表示中サーバーIDとノートIDを取り出す。 */
function getUrlLocation(): UrlLocation {
  const path = window.location.pathname;
  if (!path.startsWith(BASE_PATH)) return {serverId: null, noteId: null};
  const rest = path.slice(BASE_PATH.length).replace(/^\/+/, "").replace(/\/+$/, "");
  if (rest === "") return {serverId: null, noteId: null};
  const segs = rest.split("/");
  if (segs[0] === "r") {
    // `/home/r/<serverId>[/<noteId>]`
    const serverId = segs[1] != null && /^[0-9a-zA-Z-]+$/.test(segs[1]) ? segs[1] : null;
    if (serverId == null) return {serverId: null, noteId: null};
    return {serverId, noteId: parseNoteId(segs[2])};
  }
  return {serverId: null, noteId: parseNoteId(segs[0])};
}

/** 表示中サーバー・ノートから URL パスを組み立てる。 */
function buildPath(serverId: string | null, noteId: number | null): string {
  if (serverId == null) return noteId == null ? BASE_PATH : `${BASE_PATH}/${noteId}`;
  return noteId == null ? `${BASE_PATH}/r/${serverId}` : `${BASE_PATH}/r/${serverId}/${noteId}`;
}

/** サーバーID から登録済みリモートサーバーを解決する（見つからなければ null）。 */
async function resolveServer(serverId: string): Promise<RemoteServer | null> {
  try {
    const res = await fetch("/api/rpc/remoteServers");
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.servers ?? []).find((s: RemoteServer) => s.id === serverId) ?? null;
  } catch {
    return null;
  }
}

/** APIから取得した生ノート（日付が文字列）を Note 形に正規化する。 */
function normalize(raw: any): Note {
  return {
    ...raw,
    content: raw.content ?? "",
    createdAt: raw.createdAt == null ? null : new Date(raw.createdAt),
    updatedAt: raw.updatedAt == null ? null : new Date(raw.updatedAt),
  } as Note;
}

export function useNotePermalink() {
  const selectedNote = useNote(state => state.selectedNote);
  const activeServer = useRemoteStore(state => state.activeServer);
  const {data: foldersAll} = useFoldersAll();

  // 初回の復元が終わるまでは URL の同期（push）を行わない。
  // （復元前に selectedNote=null の状態で push すると、deep-link のパラメータを消してしまう）
  const [ready, setReady] = useState(false);

  // 非同期コールバックから最新のローカルフォルダーツリーを参照するための ref。
  const foldersRef = useRef(foldersAll?.folders ?? null);
  foldersRef.current = foldersAll?.folders ?? null;

  // ローカルツリー未取得でフォルダーを解決できなかった場合に、後で解決するための保留情報。
  const pendingFolderRef = useRef<number | null>(null);

  // 復元処理の世代トークン。非同期復元が重なったとき、古い復元が新しい復元の
  // 結果を上書きしないように、開始時のトークンが最新のときだけ結果を反映する。
  const restoreTokenRef = useRef(0);
  // 復元による store 更新が中間状態で URL を push しないよう抑制するフラグ。
  const restoringRef = useRef(false);

  // URL から表示中サーバーとノートを復元する（初回 / popstate 共通）。
  const restoreFromLocation = useRef(async (loc: UrlLocation) => {
    const token = ++restoreTokenRef.current;
    restoringRef.current = true;
    try {
      const {serverId, noteId} = loc;
      const prevServerId = useRemoteStore.getState().activeServer?.id ?? null;

      // 表示中サーバーを復元する。
      let server: RemoteServer | null = null;
      if (serverId != null) {
        server = await resolveServer(serverId);
        if (token !== restoreTokenRef.current) return;
        if (server == null) {
          // サーバーが見つからない（削除された等）。ローカルルートに戻す。
          useRemoteStore.getState().setActiveServer(null);
          useNote.getState().setSelectedNote(null);
          setReady(true);
          return;
        }
      }
      useRemoteStore.getState().setActiveServer(server);
      if (server != null) {
        // サイドバーのセクションを展開させ、自動接続でツリーを表示させる。
        useLocalPrefs.getState().setRemoteExpanded(server.id, true);
      }

      const sameContext = prevServerId === serverId;

      if (noteId == null) {
        useNote.getState().setSelectedNote(null);
        pendingFolderRef.current = null;
        setReady(true);
        return;
      }

      // 同一サーバーで同じノートが既に選択済みなら何もしない
      // （popstate で同じノートに戻った場合など）。
      if (sameContext && useNote.getState().selectedNote?.id === noteId) {
        setReady(true);
        return;
      }

      // ノートを取得する（リモートならプロキシ経由＋BASIC認証添付）。
      let note: Note | null = null;
      try {
        const res = await utils.apiFetch(apiFor(serverId, `/api/notes/${noteId}`));
        if (token !== restoreTokenRef.current) return;
        if (res.ok) {
          const raw = await res.json();
          if (raw != null) note = normalize(raw);
        }
      } catch {
        // ネットワークエラー時は復元をあきらめる。
      }
      if (token !== restoreTokenRef.current) return;

      if (note == null) {
        setReady(true);
        return;
      }

      // 所属フォルダーを選択する。
      if (note.folderId != null) {
        if (serverId == null) {
          // ローカル: 取得済みツリーから解決。未取得なら保留して後で解決する。
          const folders = foldersRef.current;
          const folder = folders ? findFolderById(note.folderId, folders) : null;
          if (folder) {
            useNote.getState().setSelectedFolder(folder as any);
            pendingFolderRef.current = null;
          } else {
            pendingFolderRef.current = note.folderId;
          }
        } else {
          // リモート: そのサーバーのツリーを取得して解決する。
          pendingFolderRef.current = null;
          try {
            const res = await utils.apiFetch(apiFor(serverId, "/api/rpc/getFoldersAll"));
            if (token !== restoreTokenRef.current) return;
            if (res.ok) {
              const data = await res.json();
              const folder = findFolderById(note.folderId, data?.folders ?? []);
              if (folder) useNote.getState().setSelectedFolder(folder as any);
            }
          } catch {
            // ツリー取得に失敗してもノート自体の復元は続ける。
          }
          if (token !== restoreTokenRef.current) return;
        }
      }

      // 復元時は選択ノートが一覧内に見えるようスクロールを要求する。
      // （同一フォルダー内での popstate では notesRaw が変わらず shouldScroll が
      //  立たないため、ここで明示的に true にする。）
      useNoteList.getState().setShouldScroll(true);

      // ノートを選択する。フォルダーのフル版が揃うと NoteEditor 側の処理で
      // 一覧内の同一オブジェクトに差し替えられ、一覧のハイライトも一致する。
      useNote.getState().setSelectedNote(note);
      setReady(true);
    } finally {
      if (token === restoreTokenRef.current) restoringRef.current = false;
    }
  }).current;

  // 初回ロード時の復元。
  useEffect(() => {
    restoreFromLocation(getUrlLocation());
  }, [restoreFromLocation]);

  // 戻る/進む（popstate）への対応。
  useEffect(() => {
    const onPopState = () => {
      restoreFromLocation(getUrlLocation());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [restoreFromLocation]);

  // ローカルツリーが後から取得できたら、保留中のフォルダー選択を解決する。
  useEffect(() => {
    const folderId = pendingFolderRef.current;
    if (folderId == null || foldersAll == null) return;
    const folder = findFolderById(folderId, foldersAll.folders);
    if (folder) {
      useNote.getState().setSelectedFolder(folder as any);
      pendingFolderRef.current = null;
    }
  }, [foldersAll]);

  // 選択中ノート／表示中サーバーが変わったら URL を同期する。
  useEffect(() => {
    if (!ready || restoringRef.current) return;
    const serverId = activeServer?.id ?? null;
    const noteId = selectedNote?.id ?? null;
    const cur = getUrlLocation();
    // すでに URL が一致している場合は push しない（popstate / 初回復元の二重 push を防ぐ）。
    if (cur.serverId === serverId && cur.noteId === noteId) return;

    const url = new URL(window.location.href);
    url.pathname = buildPath(serverId, noteId);
    window.history.pushState(null, "", url);
  }, [selectedNote, activeServer, ready]);
}
