import {api} from "@/app/home/remote";
import * as utils from "@/app/utils";
import {buildNoteRefPreview} from "@/app/home/components/NoteEditor/noteRef/preview";
import type {NoteRefPreview} from "@/app/home/components/NoteEditor/noteRef/types";

// note-ref 要素の表示タイトルとホバーツールチップで共有するプレビューキャッシュ。
// null は「取得できたが存在しない（削除済み等）」を表す。取得失敗はキャッシュしない。
const cache = new Map<number, Promise<NoteRefPreview | null>>();

export function fetchNoteRefPreview(noteId: number): Promise<NoteRefPreview | null> {
  let promise = cache.get(noteId);
  if (promise == null) {
    promise = (async () => {
      const res = await utils.apiFetch(api(`/api/notes/${noteId}`));
      if (!res.ok) throw new Error(`note fetch failed: ${res.status}`);
      const raw = await res.json();
      return raw == null ? null : buildNoteRefPreview(raw);
    })();
    promise.catch(() => cache.delete(noteId));
    cache.set(noteId, promise);
  }
  return promise;
}
