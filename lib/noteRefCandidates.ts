import {filterVisibleByFolderLock} from "@/lib/folderLock";
import {htmlToPlainText} from "@/lib/noteSummary";
import {prisma} from "@/lib/prisma";

export const DEFAULT_NOTE_REF_CANDIDATE_LIMIT = 20;
export const MAX_NOTE_REF_CANDIDATE_LIMIT = 50;

const FETCH_LIMIT = 200;
const UNTITLED_NOTE_TITLE = "無題のノート";

type NoteRefCandidateSource = {
  id: number,
  title: string,
  summary: string,
  content: string,
  folderId: number | null,
};

export type NoteRefCandidate = {
  id: number,
  title: string,
  summary: string,
  label: string,
};

export function parsePositiveInt(value: string | null | undefined): number | null {
  if (value == null || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function getNoteRefCandidateLimit(value: string | null | undefined): number {
  const parsed = parsePositiveInt(value);
  if (parsed == null) return DEFAULT_NOTE_REF_CANDIDATE_LIMIT;
  return Math.min(parsed, MAX_NOTE_REF_CANDIDATE_LIMIT);
}

function getNoteSummary(note: NoteRefCandidateSource, length: number): string {
  return note.summary.trim() || htmlToPlainText(note.content).substring(0, length);
}

function getNoteLabel(note: NoteRefCandidateSource): string {
  const title = note.title.trim();
  if (title !== "" && title !== UNTITLED_NOTE_TITLE) return title;

  return getNoteSummary(note, 80) || UNTITLED_NOTE_TITLE;
}

export async function getNoteRefCandidates({
  limit,
  excludeId,
}: {
  limit: number,
  excludeId: number | null,
}): Promise<NoteRefCandidate[]> {
  const notes = await prisma.note.findMany({
    where: excludeId == null ? undefined : {id: {not: excludeId}},
    select: {
      id: true,
      title: true,
      summary: true,
      content: true,
      folderId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [
      {updatedAt: "desc"},
      {createdAt: "desc"},
      {id: "desc"},
    ],
    take: FETCH_LIMIT,
  });

  const visible = await filterVisibleByFolderLock(notes);
  return visible.slice(0, limit).map(note => ({
    id: note.id,
    title: note.title,
    summary: getNoteSummary(note, 120),
    label: getNoteLabel(note),
  }));
}
