import {format} from "date-fns";

export function dateToText(date: Date) {
  return format(date, 'yyyy/MM/dd');
}

/**
 * fetchのラッパー。リモートプロキシ（/api/remote/<id>/...）宛の場合は
 * sessionStorageのBASIC認証情報を x-remote-authorization ヘッダーで添付する。
 */
export function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const match = url.match(/^\/api\/remote\/([^/]+)\//);
  if (match != null && typeof window !== "undefined") {
    const auth = window.sessionStorage.getItem("remoteAuth:" + match[1]);
    if (auth != null) {
      const headers = new Headers(init?.headers);
      headers.set("x-remote-authorization", auth);
      init = {...init, headers};
    }
  }
  return fetch(url, init);
}

export function jsonFetcher<T = any>(url: string): Promise<T> {
  return apiFetch(url).then(res => res.json());
}

export function postJson(url: string, json: any = {}): Promise<Response> {
  return apiFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(json),
  });
}

export function putJson(url: string, json: any): Promise<Response> {
  return apiFetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(json),
  });
}

export function deleteJson(url: string): Promise<Response> {
  return apiFetch(url, {
    method: "DELETE",
  });
}