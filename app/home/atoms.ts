import {atom} from "recoil";
import {Folder, Note} from "@prisma/client";

export const atoms = {
  selectedFolder: atom({
    key: 'selectedFolder',
    default: null as Folder & { notes: Note[] } | null,
  }),

  selectedNote: atom({
    key: 'selectedNote',
    default: null as Note | null,
  }),

  changedNotes: atom({
    key: "changedNotes",
    default: [new Map<number, { id: number, title: string, content: string, updatedAt: Date | null }>()],
  }),

  showSideBar: atom({
    key: "showSideBar",
    default: true,
  }),
  showNoteListView: atom({
    key: "showNoteListView",
    default: true,
  }),
}
