import {htmlToPlainText} from "@/lib/noteSummary";
import {UNTITLED_NOTE_TITLE, type NoteRefPreview} from "@/app/home/components/NoteEditor/noteRef/types";

const NOTE_REF_SUMMARY_LENGTH = 120;

export function buildNoteRefPreview(note: any): NoteRefPreview {
  const title = typeof note?.title === "string" && note.title.trim() !== ""
    ? note.title
    : UNTITLED_NOTE_TITLE;
  const content = typeof note?.content === "string" ? note.content : "";
  return {
    title,
    summary: htmlToPlainText(content).substring(0, NOTE_REF_SUMMARY_LENGTH),
  };
}
