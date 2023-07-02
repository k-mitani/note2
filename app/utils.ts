import {format} from "date-fns";
import {RecoilState, SetterOrUpdater, useRecoilState} from "recoil";
import {useLocalStorage} from "usehooks-ts";
import {useEffect} from "react";

export function parseDate(date: string): Date {
  const year = parseInt(date.substring(0, 4));
  const month = parseInt(date.substring(4, 6)) - 1; // 月は0から11で表現されるため、1を引きます
  const day = parseInt(date.substring(6, 8));
  const hour = parseInt(date.substring(9, 11));
  const minute = parseInt(date.substring(11, 13));
  const second = parseInt(date.substring(13, 15));
  return new Date(Date.UTC(year, month, day, hour, minute, second))
}

export function dateToText(date: Date) {
  return format(date, 'yyyy/MM/dd');
}

export function coerceDate(obj: any, key: string) {
  if (obj[key] instanceof Date) {
    return;
  }
  obj[key] = new Date(obj[key]);
}

export function useRecoilLocalStorage<T>(atom: RecoilState<T>): [T, SetterOrUpdater<T>] {
  const [state, setter] = useRecoilState(atom);
  const [l, ls] = useLocalStorage(atom.key as string, state);
  useEffect(() => {
    if (l !== state) {
      setter(l);
    }
  }, []);

  return [state, (newValue) => {
    setter(newValue);
    ls(newValue);
  }];
}
