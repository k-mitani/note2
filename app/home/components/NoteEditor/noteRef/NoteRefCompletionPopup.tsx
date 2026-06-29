import React from "react";
import {
  UNTITLED_NOTE_TITLE,
  type NoteRefCandidate,
  type NoteRefCompletionState,
} from "@/app/home/components/NoteEditor/noteRef/types";

function getCandidateTitle(candidate: NoteRefCandidate): string {
  const title = candidate.title.trim();
  return title === "" ? UNTITLED_NOTE_TITLE : title;
}

export function NoteRefCompletionPopup({
  completion,
  listRef,
  onSelectIndex,
  onApply,
}: {
  completion: NoteRefCompletionState,
  listRef: React.RefObject<HTMLDivElement | null>,
  onSelectIndex: (index: number) => void,
  onApply: (candidate: NoteRefCandidate) => void,
}) {
  return (
    <div
      className="fixed z-50 w-80 max-w-[calc(100vw-1rem)] overflow-hidden rounded border border-gray-300 bg-white text-xs text-gray-700 shadow-lg dark:border-gray-700 dark:bg-neutral-900 dark:text-gray-200"
      style={{left: completion.x, top: completion.y}}
    >
      {completion.loading && (
        <div className="px-3 py-2 text-gray-500 dark:text-gray-400">loading...</div>
      )}
      {!completion.loading && completion.candidates.length === 0 && (
        <div className="px-3 py-2 text-gray-500 dark:text-gray-400">候補なし</div>
      )}
      {!completion.loading && completion.candidates.length > 0 && (
        <div className="max-h-72 overflow-y-auto py-1" ref={listRef}>
          {completion.candidates.map((candidate, index) => {
            const candidateTitle = getCandidateTitle(candidate);
            return (
              <button
                key={candidate.id}
                data-note-ref-candidate-index={index}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left ${index === completion.selectedIndex ? "bg-blue-50 dark:bg-sky-950" : "hover:bg-gray-100 dark:hover:bg-neutral-800"}`}
                onMouseEnter={() => onSelectIndex(index)}
                onMouseDown={ev => {
                  ev.preventDefault();
                  onApply(candidate);
                }}
              >
                <span className="shrink-0 font-mono text-[11px] leading-5 text-blue-600 dark:text-sky-400">@{candidate.id}</span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 font-medium leading-5 text-gray-900 dark:text-gray-100">
                    {candidateTitle}
                  </span>
                  {candidate.summary !== "" && (
                    <span className="mt-0.5 line-clamp-3 whitespace-normal leading-4 text-gray-500 dark:text-gray-400">
                      {candidate.summary}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
