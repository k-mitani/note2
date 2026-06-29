import type {NoteRefTooltip} from "@/app/home/components/NoteEditor/noteRef/types";

export function NoteRefTooltipPopup({tooltip}: { tooltip: NoteRefTooltip }) {
  return (
    <div
      className="pointer-events-none fixed z-50 max-w-xs rounded border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 shadow-lg dark:border-gray-700 dark:bg-neutral-900 dark:text-gray-200"
      style={{left: tooltip.x, top: tooltip.y}}
    >
      <div className="font-semibold text-gray-900 dark:text-gray-100">{tooltip.title}</div>
      {tooltip.loading && <div className="mt-1 text-gray-500 dark:text-gray-400">loading...</div>}
      {!tooltip.loading && tooltip.summary !== "" && (
        <div className="mt-1 line-clamp-4 whitespace-normal text-gray-600 dark:text-gray-400">
          {tooltip.summary}
        </div>
      )}
    </div>
  );
}
