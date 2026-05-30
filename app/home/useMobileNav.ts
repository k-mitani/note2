import {create} from "zustand";

/** モバイル時のドリルダウン階層。 */
export type MobileView = "folders" | "notes" | "editor";

interface MobileNavStore {
  /** 現在表示している階層（モバイル時のみ意味を持つ）。 */
  view: MobileView;
  setView: (view: MobileView) => void;
}

/**
 * モバイル(ドリルダウン)レイアウトで、いまどの階層を表示しているかを保持するストア。
 *
 * フォルダーやノートを選択したときに `setView` を呼んで次の階層へ進める。
 * PC表示時はこの値は参照されないため、PCで `setView` が呼ばれても影響はない。
 */
export const useMobileNav = create<MobileNavStore>((set) => ({
  view: "folders",
  setView: (view) => set({view}),
}));
