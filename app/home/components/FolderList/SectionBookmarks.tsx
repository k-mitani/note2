import type {Note} from "@/app/generated/prisma/browser";

/**
 * セクション内のショートカット（ブックマーク）一覧。
 * ローカル/リモートの各セクションで共通に使う。ダブルクリックで折りたたみ。
 */
export function SectionBookmarks({bookmarks, folded, setFolded, onSelect}: {
  bookmarks: Note[],
  folded: boolean,
  setFolded: (folded: boolean) => void,
  onSelect: (note: Note) => void,
}) {
  return (
    <div>
      <button
        className="hover:bg-gray-600 w-full text-start text-sm md:text-base"
        onDoubleClick={(e) => {
          e.stopPropagation();
          setFolded(!folded);
        }}
      >
        🔖ショートカット <span className="text-gray-400">({bookmarks.length})</span>
        {bookmarks.length > 0 && (
          <span className="text-gray-500 ml-1">
            {folded ? "▶" : "▼"}
          </span>
        )}
      </button>
      {!folded && bookmarks.length > 0 && (
        <ul>
          {bookmarks.map(note => (
            <li key={note.id}>
              <button
                className="hover:bg-gray-600 w-full text-start text-xs md:text-sm px-2 py-1 truncate"
                onClick={() => onSelect(note)}
              >
                {note.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
