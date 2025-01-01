import {create} from 'zustand';

interface Store {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useSetting = create<Store>((set, get) => ({
  isOpen: false,
  open: () => set({isOpen: true}),
  close: () => set({isOpen: false}),
}));