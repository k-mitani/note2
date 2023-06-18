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
}
