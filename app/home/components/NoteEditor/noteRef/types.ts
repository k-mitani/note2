export const NOTE_REF_COMPLETION_LIMIT = 20;
export const UNTITLED_NOTE_TITLE = "無題のノート";

export type NoteRefToken = {
  noteId: number,
  range: Range,
};

export type NoteRefCompletionTrigger = {
  range: Range,
  prefix: string,
};

export type NoteRefCandidate = {
  id: number,
  title: string,
  summary: string,
  label: string,
};

export type NoteRefCompletionState = {
  prefix: string,
  x: number,
  y: number,
  loading: boolean,
  candidates: NoteRefCandidate[],
  selectedIndex: number,
};

export type NoteRefPreview = {
  title: string,
  summary: string,
};

export type NoteRefTooltip = NoteRefPreview & {
  noteId: number,
  x: number,
  y: number,
  loading: boolean,
};
