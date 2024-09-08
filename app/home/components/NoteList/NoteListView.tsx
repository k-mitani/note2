import React, {useEffect} from "react";
import classNames from "classnames";
import {useNote, useLocalPreferences} from "@/app/home/state";
import {useNoteList} from "@/app/home/components/NoteList/state";
import {useListOrder} from "@/app/home/components/NoteList/hooks";
import {useFolderAndNotes} from "@/app/home/hooks";
import NoteCard from "@/app/home/components/NoteList/NoteCard";
import NoteListHeader from "@/app/home/components/NoteList/NoteListHeader";
import {useKeyEventHandlers} from "@/app/home/components/NoteList/hooks";

/**
 * ノート一覧
 */
export default function NoteListView() {
  console.log("NoteListView prepare render");
  const selectedNote = useNote(state => state.selectedNote);
  const [changedNotes] = useNote(state => state.changedNotes);
  const showNoteListView = useLocalPreferences(state => state.showNoteListView);

  const selectedFolder = useNote(state => state.selectedFolder);
  const {notes: notesRaw, isLoading} = useFolderAndNotes(selectedFolder?.id);
  const noteCount = notesRaw.length;

  console.log("NoteListView prepare render for sort");
  const {notes, refSelectedNoteElement} = useListOrder(notesRaw);

  console.log("NoteListView prepare render for notes");
  const getDragSourceNotes = useNoteList(state => state.getDragSourceNotes);
  const multiSelectionMode = useNoteList(state => state.multiSelectionMode);
  const setMultiSelectionMode = useNoteList(state => state.setMultiSelectionMode);
  const setMultiSelection = useNoteList(state => state.setMultiSelection);
  const setShouldScroll = useNoteList(state => state.setShouldScroll);
  const isMultiSelected = useNoteList(state => state.isMultiSelected);
  const setSelectedNote = useNote(state => state.setSelectedNote);
  const {onKeyDown, onCtrlClick, onShiftClick} = useKeyEventHandlers(notesRaw);

  console.log("NoteListView render");

  return (
    <div className={classNames(
      'flex flex-1 flex-col h-0 basis-80 md:flex-none md:h-full w-48 md:w-72',
      'bg-gray-100 dark:bg-gray-900 dark:text-gray-400',
      {'hidden': !showNoteListView},
    )}>
      {/*ヘッダー*/}
      <NoteListHeader noteCount={noteCount}/>

      {/* ロード中の場合 */}
      {isLoading && <div className="flex-grow p-2">loading...</div>}
      {!isLoading && notes.length === 0 && <div className="flex-grow p-2">no notes</div>}
      {!isLoading && notes.length > 0 && <ul id="note-list" className="flex-grow overflow-y-scroll">
        {notes?.map((note: any, i: number) => {
          return (
            <li key={note.name + "-" + i} id={`note-${i}`}>
              <NoteCard note={note}
                        getDragSourceNotes={getDragSourceNotes as any}
                        multiSelectionMode={multiSelectionMode}
                        setMultiSelectionMode={setMultiSelectionMode}
                        isMultiSelected={isMultiSelected(note)}
                        setMultiSelection={setMultiSelection}
                        setShouldScroll={setShouldScroll}
                        setSelectedNote={setSelectedNote}
                        _ref={selectedNote === note ? refSelectedNoteElement : null as any}
                        changed={changedNotes.get(note.id)}
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
