import {create} from 'zustand';
import {useMemo} from 'react';
import useSWR from 'swr';
import * as utils from '@/app/utils';
import type {Note} from '@/app/generated/prisma/browser';

/** trigram検索のため、入力中に自動で検索を確定する最小文字数。Enterならこれ未満でも検索する。 */
export const SEARCH_MIN_LENGTH = 3;

interface SearchStore {
  // 検索ボックスに入力中の文字列。
  input: string;
  setInput: (v: string) => void;
  // 実際に検索を実行する確定済みクエリ（3文字以上で自動、またはEnterで確定）。
  query: string;
  setQuery: (v: string) => void;
  // 「検索結果」仮想フォルダー（全フォルダー横断のヒット一覧）を表示中ならtrue。
  viewingResults: boolean;
  setViewingResults: (b: boolean) => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
  input: '',
  setInput: (v) => set({input: v}),
  query: '',
  setQuery: (v) => set({query: v}),
  viewingResults: false,
  setViewingResults: (b) => set({viewingResults: b}),
}));

const EMPTY_NOTES: Note[] = [];

/** SWRから取得したnoteは日付が文字列なので、Dateに正規化する。 */
function normalizeDates(note: any): Note {
  return {
    ...note,
    content: note.content ?? "",
    createdAt: note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt),
    updatedAt: note.updatedAt == null
      ? null
      : (note.updatedAt instanceof Date ? note.updatedAt : new Date(note.updatedAt)),
  };
}

// 同じfetch結果に対して同じ正規化済み配列を返し、ノートのオブジェクト同一性を安定させる
// （選択ハイライト等で selectedNote === note の比較が安定して動くために重要）。
const normalizedCache = new WeakMap<object, Note[]>();
function getNormalized(notes: any[] | undefined): Note[] {
  if (notes == null) return EMPTY_NOTES;
  let cached = normalizedCache.get(notes);
  if (cached == null) {
    cached = notes.map(normalizeDates);
    normalizedCache.set(notes, cached);
  }
  return cached;
}

/**
 * 確定済みクエリで全フォルダー横断の全文検索を行う。
 * - active: 検索が有効（確定クエリが空でない）かどうか。
 * - notes: ヒットしたノート（軽量版・全フォルダー横断）。
 * - noteIds: ヒットしたノートIDの一覧。
 * - folderCounts: フォルダーID(文字列) -> そのフォルダー直下のヒット件数。
 */
export function useSearch(): {
  query: string,
  active: boolean,
  notes: Note[],
  noteIds: number[],
  folderCounts: Record<string, number>,
} {
  const query = useSearchStore(s => s.query).trim();
  const active = query.length >= 1;
  const {data} = useSWR<{notes: any[]}>(
    active ? `/api/rpc/search?q=${encodeURIComponent(query)}` : null,
    utils.jsonFetcher,
  );

  const notes = useMemo(() => getNormalized(data?.notes), [data]);
  const noteIds = useMemo(() => notes.map(n => n.id), [notes]);
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of notes) {
      if (n.folderId == null) continue;
      const key = String(n.folderId);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [notes]);

  return {query, active, notes, noteIds, folderCounts};
}
