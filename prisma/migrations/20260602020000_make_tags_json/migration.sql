-- SQLite compatibility: Prisma scalar lists are PostgreSQL-only, so store tags as JSON.
ALTER TABLE "Note"
ALTER COLUMN "tags" TYPE JSONB USING COALESCE(to_jsonb("tags"), '[]'::jsonb);

ALTER TABLE "Note"
ALTER COLUMN "tags" SET DEFAULT '[]'::jsonb;

ALTER TABLE "Note"
ALTER COLUMN "tags" SET NOT NULL;
