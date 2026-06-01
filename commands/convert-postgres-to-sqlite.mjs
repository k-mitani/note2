import "dotenv/config";
import {mkdirSync, rmSync} from "node:fs";
import {dirname, resolve} from "node:path";
import Database from "better-sqlite3";
import pg from "pg";

const {Client} = pg;

const postgresUrl = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;
const sqlitePath = resolve(process.env.SQLITE_DATABASE_PATH || "./data-local/note2.sqlite");

if (!postgresUrl || !postgresUrl.startsWith("postgres")) {
  throw new Error("Set POSTGRES_DATABASE_URL or a Postgres DATABASE_URL before converting.");
}

function jsonValue(value) {
  return value == null ? null : JSON.stringify(value);
}

function dateValue(value) {
  if (value == null) return null;
  return new Date(value).toISOString().replace("Z", "+00:00");
}

mkdirSync(dirname(sqlitePath), {recursive: true});
rmSync(sqlitePath, {force: true});

const pgClient = new Client({connectionString: postgresUrl});
await pgClient.connect();

const db = new Database(sqlitePath);
db.pragma("foreign_keys = ON");
db.exec(`
CREATE TABLE "Folder" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "order" TEXT NOT NULL DEFAULT 'UPDATED_AT_DESC',
  "noteListViewMode" TEXT NOT NULL DEFAULT 'SUMMARY',
  "isLocked" BOOLEAN NOT NULL DEFAULT false,
  "parentFolderId" INTEGER,
  CONSTRAINT "Folder_parentFolderId_fkey" FOREIGN KEY ("parentFolderId") REFERENCES "Folder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Note" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "summary" TEXT NOT NULL DEFAULT '',
  "tags" JSONB NOT NULL DEFAULT '[]',
  "resource" JSONB,
  "attributes" JSONB,
  "bookmarked" BOOLEAN NOT NULL DEFAULT false,
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME,
  "folderId" INTEGER,
  CONSTRAINT "Note_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "KeyValue" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "value" JSONB NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "Note_folderId_idx" ON "Note"("folderId");
`);

const folders = (await pgClient.query(`
  SELECT "id", "name", "order", "noteListViewMode", "isLocked", "parentFolderId"
  FROM "Folder"
  ORDER BY "id"
`)).rows;

const notes = (await pgClient.query(`
  SELECT "id", "title", "content", "summary", "tags", "resource", "attributes",
         "bookmarked", "pinned", "createdAt", "updatedAt", "folderId"
  FROM "Note"
  ORDER BY "id"
`)).rows;

const keyValues = (await pgClient.query(`
  SELECT "key", "value", "createdAt", "updatedAt"
  FROM "KeyValue"
  ORDER BY "key"
`)).rows;

const insertFolder = db.prepare(`
  INSERT INTO "Folder" ("id", "name", "order", "noteListViewMode", "isLocked", "parentFolderId")
  VALUES (@id, @name, @order, @noteListViewMode, @isLocked, @parentFolderId)
`);
const updateFolderParent = db.prepare(`
  UPDATE "Folder" SET "parentFolderId" = @parentFolderId WHERE "id" = @id
`);
const insertNote = db.prepare(`
  INSERT INTO "Note" ("id", "title", "content", "summary", "tags", "resource", "attributes",
                      "bookmarked", "pinned", "createdAt", "updatedAt", "folderId")
  VALUES (@id, @title, @content, @summary, @tags, @resource, @attributes,
          @bookmarked, @pinned, @createdAt, @updatedAt, @folderId)
`);
const insertKeyValue = db.prepare(`
  INSERT INTO "KeyValue" ("key", "value", "createdAt", "updatedAt")
  VALUES (@key, @value, @createdAt, @updatedAt)
`);

db.transaction(() => {
  for (const folder of folders) {
    insertFolder.run({
      ...folder,
      isLocked: folder.isLocked ? 1 : 0,
      parentFolderId: null,
    });
  }

  for (const folder of folders) {
    if (folder.parentFolderId != null) {
      updateFolderParent.run({
        id: folder.id,
        parentFolderId: folder.parentFolderId,
      });
    }
  }

  for (const note of notes) {
    insertNote.run({
      ...note,
      tags: jsonValue(note.tags ?? []),
      resource: jsonValue(note.resource),
      attributes: jsonValue(note.attributes),
      bookmarked: note.bookmarked ? 1 : 0,
      pinned: note.pinned ? 1 : 0,
      createdAt: dateValue(note.createdAt),
      updatedAt: dateValue(note.updatedAt),
    });
  }

  for (const keyValue of keyValues) {
    insertKeyValue.run({
      ...keyValue,
      value: jsonValue(keyValue.value),
      createdAt: dateValue(keyValue.createdAt),
      updatedAt: dateValue(keyValue.updatedAt),
    });
  }
})();

db.exec(`
  UPDATE sqlite_sequence SET seq = (SELECT COALESCE(MAX("id"), 0) FROM "Folder") WHERE name = 'Folder';
  UPDATE sqlite_sequence SET seq = (SELECT COALESCE(MAX("id"), 0) FROM "Note") WHERE name = 'Note';
`);

const counts = {
  folders: db.prepare(`SELECT COUNT(*) AS count FROM "Folder"`).get().count,
  notes: db.prepare(`SELECT COUNT(*) AS count FROM "Note"`).get().count,
  keyValues: db.prepare(`SELECT COUNT(*) AS count FROM "KeyValue"`).get().count,
};

db.close();
await pgClient.end();

console.log(`Converted Postgres data to ${sqlitePath}`);
console.log(JSON.stringify(counts, null, 2));
