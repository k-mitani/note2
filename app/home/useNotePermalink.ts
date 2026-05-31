"use client";

import {useEffect, useRef, useState} from "react";
import {useNote} from "@/app/home/state";
import {useNoteList} from "@/app/home/components/NoteList/state";
import {useFoldersAll} from "@/app/home/hooks";
import {findFolderById} from "@/lib/folderTree";
import type {Note} from "@/app/generated/prisma/browser";

/**
 * ノートのパーマリンク（`/home/<id>`）と、ブラウザの戻る/進む（History API）を実装するフック。
 *
 * ルートは optional catch-all（`app/home/[[...slug]]/page.tsx`）で、`/home` と `/home/<id>` が
 * 同一セグメントにマッチする。そのため URL 変更は生の History API（pushState）だけで完結し、
 * Next のルーティング（再マウント）が発生しない。
 *
 * - 選択中のノートが変わると URL を `/home/<id>` に push する（戻る/進むで履歴をたどれる）。
 * - 戻る/進む（popstate）時は URL の note id から選択を復元する。
 * - 初回ロード時、URL が `/home/<id>` ならそのノートを復元する
 *   （所属フォルダーが分からないので単一ノート取得APIで folderId を解決する）。
 *
 * タイトルは常に "note2" のままにする（プライバシー配慮）。document.title は一切変更しない。
 * pushState の第2引数（title）はブラウザに無視されるため、タイトルへの影響はない。
 */
const BASE_PATH = "/home";

function getUrlNoteId(): number | null {
  const path = window.location.pathname;
  if (!path.startsWith(BASE_PATH)) return null;
  // `/home` / `/home/` → null、`/home/<id>` → <id>。前後のスラッシュを除いた先頭セグメントを id とする。
  const seg = path.slice(BASE_PATH.length).replace(/^\/+/, "").replace(/\/+$/, "").split("/")[0];
  if (seg === "") return null;
  const id = parseInt(seg, 10);
  // 純粋な数値セグメントのみ受け付ける（"1abc" 等は弾く）。
  return Number.isFinite(id) && String(id) === seg ? id : null;
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
  const {data: foldersAll} = useFoldersAll();

  // 初回の復元が終わるまでは URL の同期（push）を行わない。
  // （復元前に selectedNote=null の状態で push すると、deep-link の note パラメータを消してしまう）
  const [ready, setReady] = useState(false);

  // 非同期コールバックから最新のフォルダーツリーを参照するための ref。
  const foldersRef = useRef(foldersAll?.folders ?? null);
  foldersRef.current = foldersAll?.folders ?? null;

  // フォルダーツリーが未取得でフォルダーを解決できなかった場合に、後で解決するための保留情報。
  const pendingFolderRef = useRef<number | null>(null);

  // URL の note id から選択を復元する（初回 / popstate 共通）。
  const selectNoteById = useRef(async (id: number | null) => {
    const store = useNote.getState();
    if (id == null) {
      store.setSelectedNote(null);
      pendingFolderRef.current = null;
      setReady(true);
      return;
    }
    // すでに同じノートが選択済みなら何もしない（popstate で同じノートに戻った場合など）。
    if (store.selectedNote?.id === id) {
      setReady(true);
      return;
    }

    let note: Note | null = null;
    try {
      const res = await fetch(`/api/notes/${id}`);
      if (res.ok) {
        const raw = await res.json();
        if (raw != null) note = normalize(raw);
      }
    } catch {
      // ネットワークエラー時は復元をあきらめる。
    }

    if (note == null) {
      setReady(true);
      return;
    }

    // 所属フォルダーを選択する。ツリー未取得なら保留して後で解決する。
    if (note.folderId != null) {
      const folders = foldersRef.current;
      const folder = folders ? findFolderById(note.folderId, folders) : null;
      if (folder) {
        useNote.getState().setSelectedFolder(folder as any);
        pendingFolderRef.current = null;
      } else {
        pendingFolderRef.current = note.folderId;
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
  }).current;

  // 初回ロード時の復元。
  useEffect(() => {
    selectNoteById(getUrlNoteId());
  }, [selectNoteById]);

  // 戻る/進む（popstate）への対応。
  useEffect(() => {
    const onPopState = () => {
      selectNoteById(getUrlNoteId());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [selectNoteById]);

  // フォルダーツリーが後から取得できたら、保留中のフォルダー選択を解決する。
  useEffect(() => {
    const folderId = pendingFolderRef.current;
    if (folderId == null || foldersAll == null) return;
    const folder = findFolderById(folderId, foldersAll.folders);
    if (folder) {
      useNote.getState().setSelectedFolder(folder as any);
      pendingFolderRef.current = null;
    }
  }, [foldersAll]);

  // 選択中ノートが変わったら URL を同期する。
  useEffect(() => {
    if (!ready) return;
    const id = selectedNote?.id ?? null;
    const urlId = getUrlNoteId();
    // すでに URL が一致している場合は push しない（popstate / 初回復元の二重 push を防ぐ）。
    if (id === urlId) return;

    const url = new URL(window.location.href);
    url.pathname = id == null ? BASE_PATH : `${BASE_PATH}/${id}`;
    window.history.pushState(null, "", url);
  }, [selectedNote, ready]);
}
