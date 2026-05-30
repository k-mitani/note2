import {format} from "date-fns";

export function dateToText(date: Date) {
  return format(date, 'yyyy/MM/dd');
}

export function jsonFetcher<T = any>(url: string): Promise<T> {
  return fetch(url).then(res => res.json());
}

export function postJson(url: string, json: any = {}): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(json),
  });
}

export function putJson(url: string, json: any): Promise<Response> {
  return fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(json),
  });
}

export function deleteJson(url: string): Promise<Response> {
  return fetch(url, {
    method: "DELETE",
  });
}