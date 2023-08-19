/*
  Warnings:

  - The primary key for the `KeyValue` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `KeyValue` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "KeyValue" DROP CONSTRAINT "KeyValue_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "KeyValue_pkey" PRIMARY KEY ("key");
