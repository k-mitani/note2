import {create} from 'zustand';
import type {Folder, Note} from '@/app/generated/prisma/browser';

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
  removeSavedNotes: (saved: ChangedNote[]) => void;
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

  // 保存に送った分だけを削除する。保存中（await中）に追加された変更を
  // 巻き込んで消さないようにするため、clearChangedNotesではなくこちらを使う。
  // addChangedNoteは毎回新しいオブジェクトをsetするので、送信時の参照と
  // 現在の参照が一致する場合のみ削除すれば、保存後の再編集を保持できる。
  removeSavedNotes: (saved) => set((state) => {
    const next = new Map(state.changedNotes);
    for (const note of saved) {
      if (next.get(note.id) === note) next.delete(note.id);
    }
    return {changedNotes: next};
  }),
}));
