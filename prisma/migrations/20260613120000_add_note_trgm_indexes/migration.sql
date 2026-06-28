-- 部分一致検索（ILIKE '%q%'）を高速化するためのtrigram拡張とGINインデックス。
-- 全フォルダー横断の全文検索（/api/rpc/search）で title / content を検索する。
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Note_title_trgm_idx" ON "Note" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Note_content_trgm_idx" ON "Note" USING gin (content gin_trgm_ops);
