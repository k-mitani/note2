/** 削除（ゴミ箱）を表すフォルダーID。 */
export const TRASH_FOLDER_ID = -1;

/** サイドバーのショートカット欄の開閉状態を保存するためのキー（folderFoldingStateDict上）。 */
export const SHORTCUTS_FOLDING_KEY = -2;

/** インデントスタイル（最大6段階）。 */
export const FOLDER_INDENT_CLASSES = [
  "ps-0",
  "ps-[0.625rem] md:ps-[1.25rem]",
  "ps-[1.25rem] md:ps-[2.5rem]",
  "ps-[1.875rem] md:ps-[3.75rem]",
  "ps-[2.5rem] md:ps-[5rem]",
  "ps-[3.125rem] md:ps-[6.25rem]",
];

/** NoteEditor内の折りたたみ可能なブロックのCSSクラス名。 */
export const FOLDABLE_CLASS = {
  WRAPPER: "ncf-20260403",
  HEADER: "ncf-header-20260403",
  TOGGLE: "ncf-toggle-20260403",
  TITLE: "ncf-title-20260403",
  CONTENT: "ncf-content-20260403",
  FOLDED: "folded-20260403",
} as const;
