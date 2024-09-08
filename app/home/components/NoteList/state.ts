import {create} from 'zustand';
import {Note} from "@prisma/client";

interface Store {
  selectedOrder: number;
  setSelectedOrder: (order: number) => void;

  shouldScroll: boolean;
  setShouldScroll: (b: boolean) => void;

  showOrderItems: boolean;
  setShowOrderItems: (b: boolean) => void;
  toggleShowOrderItems: () => void;

  multiSelectionMode: boolean;
  setMultiSelectionMode: (b: boolean) => void;
  toggleMultiSelectionMode: () => void;

  multiSelectionNotes: { v: Set<Note> };
  setMultiSelectionNotes: (notes: { v: Set<Note> }) => void;

  isMultiSelected: (note: Note) => boolean;
  setMultiSelection: (note: Note, on: boolean) => void;

  getDragSourceNotes: (selectedNote: Note) => { notes: Note[] } | null;
}

export const useNoteList = create<Store>((set, get) => ({
  selectedOrder: 0,
  setSelectedOrder: (order) => set({selectedOrder: order}),

  shouldScroll: true,
  setShouldScroll: (b) => set({shouldScroll: b}),

  showOrderItems: false,
  setShowOrderItems: (b) => set({showOrderItems: b}),
  toggleShowOrderItems: () => set({showOrderItems: !get().showOrderItems}),

  multiSelectionMode: false,
  setMultiSelectionMode: (b) => set({multiSelectionMode: b}),
  toggleMultiSelectionMode: () => {
    if (get().multiSelectionMode) {
      set({multiSelectionMode: false});
    }
    else {
      set({multiSelectionMode: true, multiSelectionNotes: {v: new Set()}});
    }
  },

  multiSelectionNotes: {v: new Set()},
  setMultiSelectionNotes: (notes) => set({multiSelectionNotes: notes}),

  isMultiSelected: (note: Note) => get().multiSelectionNotes.v.has(note),

  setMultiSelection: (note: Note, on: boolean) => {
    const state = get();
    const multiSelectionNotes = state.multiSelectionNotes;
    const setMultiSelectionNotes = state.setMultiSelectionNotes;
    if (on) {
      multiSelectionNotes.v.add(note);
      setMultiSelectionNotes({v: multiSelectionNotes.v});
    } else {
      multiSelectionNotes.v.delete(note);
      setMultiSelectionNotes({v: multiSelectionNotes.v});
    }
  },

  getDragSourceNotes: (selectedNote: Note): { notes: Note[] } | null => {
    const state = get();
    const multiSelectionMode = state.multiSelectionMode;
    const multiSelectionNotes = state.multiSelectionNotes;
    if (!multiSelectionMode) {
      return {notes: [selectedNote as Note]};
    }
    const notes = Array.from(multiSelectionNotes.v);
    return notes.length > 0 ? {notes} : null;
  },
}));