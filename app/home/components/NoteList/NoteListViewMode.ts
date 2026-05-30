export const NOTE_LIST_VIEW_MODE_SUMMARY = "SUMMARY";
export const NOTE_LIST_VIEW_MODE_TITLE_ONLY = "TITLE_ONLY";

export type NoteListViewMode = typeof NOTE_LIST_VIEW_MODE_SUMMARY | typeof NOTE_LIST_VIEW_MODE_TITLE_ONLY;

export type NoteListViewModeItem = {
  key: NoteListViewMode;
  label: string;
};

export const viewModeItems: NoteListViewModeItem[] = [
  {
    key: NOTE_LIST_VIEW_MODE_SUMMARY,
    label: "サマリー",
  },
  {
    key: NOTE_LIST_VIEW_MODE_TITLE_ONLY,
    label: "タイトルのみ",
  },
];

export function getNextViewMode(current: NoteListViewModeItem): NoteListViewModeItem {
  const index = viewModeItems.findIndex(item => item.key === current.key);
  return viewModeItems[(index + 1) % viewModeItems.length] ?? viewModeItems[0];
}
