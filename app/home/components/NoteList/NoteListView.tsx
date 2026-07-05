import React, {useEffect} from "react";
import classNames from "classnames";
import {useNote} from "@/app/home/state";
import {useLocalPrefs} from "@/app/home/useLocalPrefs";
import {useNoteList} from "@/app/home/components/NoteList/state";
import {useListOrder, useKeyEventHandlers} from "@/app/home/components/NoteList/hooks";
import {useFolderAndNotes} from "@/app/home/hooks";
import {useSearch, useSearchStore} from "@/app/home/search";
import NoteCard from "@/app/home/components/NoteList/NoteCard";
import NoteListHeader from "@/app/home/components/NoteList/NoteListHeader";
import {$Enums} from "@/app/generated/prisma/browser";
import {orderItems} from "@/app/home/components/NoteList/NoteListOrder";
import {NOTE_LIST_VIEW_MODE_SUMMARY, viewModeItems} from "@/app/home/components/NoteList/NoteListViewMode";

/**
 * ノート一覧
 */
export default function NoteListView({forceVisible = false}: {
  forceVisible?: boolean,
}) {
  console.log("NoteListView prepare render");
  const selectedNote = useNote(state => state.selectedNote);
  const changedNotes = useNote(state => state.changedNotes);
  const showNoteListView = useLocalPrefs(state => state.showNoteListView);

  const selectedFolder = useNote(state => state.selectedFolder);
  const {
    notes: folderNotes,
    isLoading: folderLoading,
    isFullLoaded: folderFullLoaded,
  } = useFolderAndNotes(selectedFolder?.id);

  // 「検索結果」仮想フォルダーを表示中は、選択フォルダーではなく全フォルダー横断のヒットを一覧する。
  const localQuery = useNoteList(state => state.searchQuery);
  const {active: searchActive, notes: searchNotes, noteIds} = useSearch();
  const viewingResults = useSearchStore(state => state.viewingResults);
  const inResultsView = viewingResults && searchActive;

  const notesRaw = inResultsView ? searchNotes : folderNotes;
  const isLoading = inResultsView ? false : folderLoading;
  const needsLoadFullContent = inResultsView || !folderFullLoaded;

  console.log("NoteListView prepare render for sort");
  const {notes: notesSorted, refSelectedNoteElement} = useListOrder(notesRaw);

  // 一覧の絞り込み。
  // - 検索結果ビュー: ヒット一覧そのものなのでグローバル絞り込みは不要。ローカル検索だけ適用。
  // - 通常のフォルダービュー: グローバル検索のヒットID（DBで本文全体を判定済み）とローカル検索のAND。
  const notes = React.useMemo(() => {
    let result = notesSorted;
    if (!inResultsView && searchActive) {
      const ids = new Set(noteIds);
      result = result.filter(note => ids.has(note.id));
    }
    if (localQuery.trim()) {
      const query = localQuery.toLowerCase();
      result = result.filter(note => {
        const title = (changedNotes.get(note.id)?.title ?? note.title).toLowerCase();
        const content = (changedNotes.get(note.id)?.content ?? note.content).toLowerCase();
        return title.includes(query) || content.includes(query);
      });
    }
    return result;
  }, [notesSorted, inResultsView, searchActive, noteIds, localQuery, changedNotes]);

  console.log("NoteListView prepare render for notes");
  useEffect(() => {
    // フォルダーのソート設定を反映する。
    const orderKey = selectedFolder?.order ?? $Enums.NotesOrder.UPDATED_AT_DESC;
    const order = orderItems.find(o => o.key === orderKey) ?? orderItems[0];
    useNoteList.getState().setSelectedOrder(order);

    // フォルダーの表示形式を反映する。
    const viewModeKey = selectedFolder?.noteListViewMode ?? NOTE_LIST_VIEW_MODE_SUMMARY;
    const viewMode = viewModeItems.find(o => o.key === viewModeKey) ?? viewModeItems[0];
    useNoteList.getState().setSelectedViewMode(viewMode);
  }, [selectedFolder])

  const setSelectedNote = useNote(state => state.setSelectedNote);
  const noteListState = useNoteList();
  const {onKeyDown, onCtrlClick, onShiftClick} = useKeyEventHandlers(notes);

  console.log("NoteListView render");

  return (
    <div className={classNames(
      'flex flex-1 flex-col h-0 basis-80 md:flex-none md:h-full w-48 md:w-72',
      'bg-gray-100 dark:bg-gray-900 dark:text-gray-400',
      {'hidden': !forceVisible && !showNoteListView},
    )}>
      {/*ヘッダー*/}
      <NoteListHeader folderId={inResultsView ? null : (selectedFolder?.id ?? null)} />

      {/* ロード中はすぐ終わるので何も表示しない（loading... は出さない）。 */}
      {!isLoading && notes.length === 0 && <div className="flex-grow p-2">no notes</div>}
      {!isLoading && notes.length > 0 && <ul id="note-list" className="flex-grow overflow-y-scroll">
        {notes.map((note, i) => {
          return (
            <li key={note.id} id={`note-${i}`}>
              <NoteCard note={note}
                        noteListState={noteListState}
                        setSelectedNote={setSelectedNote}
                        _ref={selectedNote === note ? refSelectedNoteElement : null}
                        changed={changedNotes.get(note.id)}
                        needsLoadFullContent={needsLoadFullContent}
                        isSelected={selectedNote === note}
                        onKeyDown={onKeyDown}
                        onCtrlClick={onCtrlClick}
                        onShiftClick={onShiftClick}
              />
            </li>);
        })}
      </ ul>}
    </div>
  )
}
