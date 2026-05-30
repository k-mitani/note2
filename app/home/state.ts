import {create} from 'zustand';
import {Folder, Note} from '@prisma/client';

export type ChangedNote = {
  id: number,
  title: string,
  content: string,
  updatedAt: Date | null,
  createdAt: Date | null,
};

interface Store {
  selectedFolder: (Folder & { notes: Note[] }) | null;
  selectedNote: Note | null;
  changedNotes: Map<number, ChangedNote>;

  setSelectedFolder: (folder: (Folder & { notes: Note[] }) | null) => void;
  setSelectedNote: (note: Note | null) => void;
  addChangedNote: (note: ChangedNote) => void;
  clearChangedNotes: () => void;
}

export const useNote = create<Store>((set) => ({
  selectedFolder: null,
  selectedNote: null,
  changedNotes: new Map(),

  setSelectedFolder: (folder) => set({selectedFolder: folder}),

  setSelectedNote: (note) => set({selectedNote: note}),

  addChangedNote: (note) => set((state) => {
    const next = new Map(state.changedNotes);
    const prevNote = next.get(note.id);
    if (note.updatedAt == null && prevNote != null) {
      note.updatedAt = prevNote.updatedAt;
    }
    if (note.createdAt == null && prevNote != null) {
      note.createdAt = prevNote.createdAt;
    }
    next.set(note.id, note);
    console.log("addChangedNote", next);
    return {changedNotes: next};
  }),

  clearChangedNotes: () => set({changedNotes: new Map()}),
}));
