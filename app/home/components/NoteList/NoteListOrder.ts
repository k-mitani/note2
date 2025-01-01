import {$Enums} from ".prisma/client";
import {Note} from "@prisma/client";

export type NoteOrderItem = {
  key: $Enums.NotesOrder;
  label: string;
  comp: (a: Note, b: Note) => number;
}

function oi(
  key: $Enums.NotesOrder,
  label: string,
  comp: (a: Note, b: Note) => number): NoteOrderItem {
  return {
    key,
    label,
    comp,
  }
}

export const orderItems = [
  oi($Enums.NotesOrder.CREATED_AT_ASC, "作成順↑", (a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
  oi($Enums.NotesOrder.CREATED_AT_DESC, "作成順↓", (a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
  oi($Enums.NotesOrder.UPDATED_AT_ASC, "更新順↑", (a, b) => (a.updatedAt ?? a.createdAt).getTime() - (b.updatedAt ?? b.createdAt).getTime()),
  oi($Enums.NotesOrder.UPDATED_AT_DESC, "更新順↓", (a, b) => (b.updatedAt ?? b.createdAt).getTime() - (a.updatedAt ?? a.createdAt).getTime()),
  oi($Enums.NotesOrder.TITLE_ASC, "名前順↑", (a, b) => a.title.localeCompare(b.title)),
  oi($Enums.NotesOrder.TITLE_DESC, "名前順↓", (a, b) => b.title.localeCompare(a.title)),
];
