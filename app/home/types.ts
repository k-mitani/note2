import {Note} from "@prisma/client";

export type NoteWithPinned = Note & { pinned: boolean };
