export const dynamic = "force-dynamic";
import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";
import {isFolderLockUnlocked} from "@/lib/folderLock";
import {htmlToPlainText} from "@/lib/noteSummary";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const FETCH_LIMIT = 200;
const UNTITLED_NOTE_TITLE = "無題のノート";

function parsePositiveInt(value: string | null): number | null {
  if (value == null || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function getLimit(value: string | null): number {
  const parsed = parsePositiveInt(value);
  if (parsed == null) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function isRestrictedByFolderMap(
  folderId: number | null,
  folderById: Map<number, { id: number, isLocked: boolean, parentFolderId: number | null }>
): boolean {
  const visited = new Set<number>();
  let currentId: number | null | undefined = folderId;
  while (currentId != null && !visited.has(currentId)) {
    visited.add(currentId);
    const folder = folderById.get(currentId);
    if (folder == null) return false;
    if (folder.isLocked) return true;
    currentId = folder.parentFolderId;
  }
  return false;
}

function noteLabel(note: { title: string, summary: string, content: string }): string {
  const title = note.title.trim();
  if (title !== "" && title !== UNTITLED_NOTE_TITLE) return title;

  const summary = note.summary.trim() || htmlToPlainText(note.content).substring(0, 80);
  return summary || UNTITLED_NOTE_TITLE;
}

export async function GET(req: NextRequest) {
  const limit = getLimit(req.nextUrl.searchParams.get("limit"));
  const excludeId = parsePositiveInt(req.nextUrl.searchParams.get("excludeId"));

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

  let visible = notes;
  if (!(await isFolderLockUnlocked())) {
    const folders = await prisma.folder.findMany({
      select: {id: true, isLocked: true, parentFolderId: true},
    });
    const folderById = new Map(folders.map(folder => [folder.id, folder]));
    visible = notes.filter(note => !isRestrictedByFolderMap(note.folderId, folderById));
  }

  return NextResponse.json({
    notes: visible.slice(0, limit).map(note => ({
      id: note.id,
      title: note.title,
      summary: note.summary || htmlToPlainText(note.content).substring(0, 120),
      label: noteLabel(note),
    })),
  });
}
