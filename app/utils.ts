import {format} from "date-fns";

export function parseDate(date: string): Date {
  const year = parseInt(date.substring(0, 4));
  const month = parseInt(date.substring(4, 6)) - 1; // 月は0から11で表現されるため、1を引きます
  const day = parseInt(date.substring(6, 8));
  const hour = parseInt(date.substring(9, 11));
  const minute = parseInt(date.substring(11, 13));
  const second = parseInt(date.substring(13, 15));
  return new Date(Date.UTC(year, month, day, hour, minute, second))
}

export function dateToText(date: string) {
  if (date == null) return "";
  const d = parseDate(date);
  return format(d, 'yyyy/MM/dd');
}

