-- CreateEnum
CREATE TYPE "NotesOrder" AS ENUM ('CREATED_AT_ASC', 'CREATED_AT_DESC', 'UPDATED_AT_ASC', 'UPDATED_AT_DESC', 'TITLE_ASC', 'TITLE_DESC');

-- AlterTable
ALTER TABLE "Folder" ADD COLUMN     "order" "NotesOrder" NOT NULL DEFAULT 'UPDATED_AT_DESC';
