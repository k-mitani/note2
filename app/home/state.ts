import {create} from 'zustand';
import {Folder, Note} from '@prisma/client';

type ChangedNote = { id: number, title: string, content: string, updatedAt: Date | null };

interface Store {
  selectedFolder: (Folder & { notes: Note[] }) | null;
  selectedNote: Note | null;
  changedNotes: Map<number, ChangedNote>[];

  setSelectedFolder: (folder: (Folder & { notes: Note[] }) | null) => void;
  setSelectedNote: (note: Note | null) => void;
  addChangedNote: (note: ChangedNote) => void;
  clearChangedNotes: () => void;
}

export const useNote = create<Store>((set) => ({
  selectedFolder: null,
  selectedNote: null,
  changedNotes: [new Map()],

  // フォルダーを選択するアクション
  setSelectedFolder: (folder) => set({selectedFolder: folder}),

  // ノートを選択するアクション
  setSelectedNote: (note) => set({selectedNote: note}),

  // 変更されたノートを追加するアクション
  addChangedNote: (note) => set((state) => {
    const prev = state.changedNotes[0];
    if (note.updatedAt == null) {
      const prevNote = prev.get(note.id);
      if (prevNote != null) {
        note.updatedAt = prevNote.updatedAt;
      }
    }
    prev.set(note.id, note);
    console.log("addChangedNote", prev);
    return {changedNotes: [prev]};
  }),
  clearChangedNotes: () => set({changedNotes: [new Map()]}),
}));

