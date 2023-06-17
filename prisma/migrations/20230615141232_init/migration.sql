/*
  Warnings:

  - Added the required column `attributes` to the `Note` table without a default value. This is not possible if the table is not empty.
  - Added the required column `resource` to the `Note` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "attributes" JSONB NOT NULL,
ADD COLUMN     "resource" JSONB NOT NULL,
ADD COLUMN     "tags" TEXT[],
ALTER COLUMN "updatedAt" DROP NOT NULL;
