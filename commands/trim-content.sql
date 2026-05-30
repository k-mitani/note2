UPDATE "Note"
SET content = regexp_replace(
        regexp_replace(
                regexp_replace(
                        content,
                        '\s*--tw-[a-z0-9-]+:\s*[^;"]*;?',
                        '',
                        'gi'
                ),
                'background-color: rgb\(255 255 255/var\(--tw-bg-opacity\)\);',
                '',
                'g'
        ),
        '\s*style=""',
        '',
        'g'
              )
WHERE content LIKE '%--tw-%'
   OR content LIKE '%background-color: rgb(255 255 255/var(--tw-bg-opacity));%'
   OR content LIKE '%style=""%';

-- SELECT LENGTH(content) / 1024 AS size_kb
--      , "Folder".name AS folder_name
--      , title
--      , content
--      , regexp_replace(
--         regexp_replace(
--                 regexp_replace(
--                         content,
--                         '\s*--tw-[a-z0-9-]+:\s*[^;"]*;?',
--                         '',
--                         'gi'
--                 ),
--                 'background-color: rgb\(255 255 255/var\(--tw-bg-opacity\)\);',
--                 '',
--                 'g'
--         ),
--         '\s*style=""',
--         '',
--         'g'
--        ) AS new_content
-- FROM "Note"
--          JOIN "Folder" ON "folderId" = "Folder".id
-- WHERE content LIKE '%--tw-%'
--    OR content LIKE '%background-color: rgb(255 255 255/var(--tw-bg-opacity));%'
--    OR content LIKE '%style=""%';

-- base64な画像の検索
-- SELECT name, LENGTH(content) / 1024 as kb, *
-- FROM "Note"
-- JOIN "Folder" ON "Note"."folderId" = "Folder".id
-- WHERE content LIKE '%<img src="data:image/%'
