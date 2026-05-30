-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "summary" TEXT NOT NULL DEFAULT '';

-- 既存ノートのsummaryをバックフィルする（HTMLタグ除去→空白圧縮→先頭200字）。
-- 以降はアプリの保存処理(lib/noteSummary.ts)が更新する。
UPDATE "Note"
SET "summary" = left(btrim(regexp_replace(regexp_replace("content", '<[^>]*>', '', 'g'), '\s+', ' ', 'g')), 200);
