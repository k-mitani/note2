import {create} from "zustand";
import {useCallback} from "react";
import useSWR from "swr";
import * as utils from "@/app/utils";

export type RemoteServer = {
  id: string,
  name: string,
  url: string,
};

interface RemoteStore {
  /** 表示中のサーバー。nullならローカル（このサーバー自身）。 */
  activeServer: RemoteServer | null;
  setActiveServer: (server: RemoteServer | null) => void;
}

/**
 * サーバー切替の状態。メモリ上のみ（リロードでローカルに戻る）。
 * BASIC認証情報はsessionStorageに置き、ブラウザセッション終了で自動消去する。
 */
export const useRemoteStore = create<RemoteStore>((set) => ({
  activeServer: null,
  setActiveServer: (server) => set({activeServer: server}),
}));

/** APIパスを現在のサーバー向けに変換する（リモートならプロキシ経由のパスにする）。 */
export function api(path: string): string {
  const server = useRemoteStore.getState().activeServer;
  if (server == null) return path;
  return `/api/remote/${server.id}${path}`;
}

/** APIパスを指定サーバー向けに変換する。nullならローカル。 */
export function apiFor(serverId: string | null, path: string): string {
  if (serverId == null) return path;
  return `/api/remote/${serverId}${path}`;
}

/**
 * api() のフック版。サーバー切替で関数の同一性が変わるため、
 * SWRキーの構築に使うとキーが切り替わり再取得される。
 */
export function useApi(): (path: string) => string {
  const serverId = useRemoteStore(state => state.activeServer?.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((path: string) => api(path), [serverId]);
}

const AUTH_STORAGE_PREFIX = "remoteAuth:";

/** リモートサーバー用BASIC認証ヘッダー値（"Basic xxx"）。無ければnull。 */
export function getRemoteAuth(serverId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(AUTH_STORAGE_PREFIX + serverId);
}

export function setRemoteAuth(serverId: string, user: string, password: string): void {
  window.sessionStorage.setItem(
    AUTH_STORAGE_PREFIX + serverId,
    "Basic " + btoa(`${user}:${password}`),
  );
}

/** 登録済みリモートサーバー一覧（常にローカルから取得）。 */
export function useRemoteServers() {
  return useSWR<{ servers: RemoteServer[], unlocked: boolean }>(
    "/api/rpc/remoteServers",
    utils.jsonFetcher,
  );
}
