import React, {useEffect} from "react";
import classNames from "classnames";
import {useNote} from "@/app/home/state";
import {useLocalPrefs} from "@/app/home/useLocalPrefs";
import {useNoteList} from "@/app/home/components/NoteList/state";
import {useListOrder} from "@/app/home/components/NoteList/hooks";
import {useFolderAndNotes} from "@/app/home/hooks";
import NoteCard from "@/app/home/components/NoteList/NoteCard";
import NoteListHeader from "@/app/home/components/NoteList/NoteListHeader";
import {useKeyEventHandlers} from "@/app/home/components/NoteList/hooks";
import {$Enums} from ".prisma/client";
import {orderItems} from "@/app/home/components/NoteList/NoteListOrder";

/**
 * ノート一覧
 */
export default function NoteListView() {
  console.log("NoteListView prepare render");
  const selectedNote = useNote(state => state.selectedNote);
  const [changedNotes] = useNote(state => state.changedNotes);
  const showNoteListView = useLocalPrefs(state => state.showNoteListView);

  const selectedFolder = useNote(state => state.selectedFolder);
  const {notes: notesRaw, isLoading} = useFolderAndNotes(selectedFolder?.id);
  const noteCount = notesRaw.length;

  console.log("NoteListView prepare render for sort");
  const {notes, refSelectedNoteElement} = useListOrder(notesRaw);

  console.log("NoteListView prepare render for notes");
  useEffect(() => {
    // フォルダーのソート設定を反映する。
    const orderKey = selectedFolder?.order ?? $Enums.NotesOrder.UPDATED_AT_DESC;
    const order = orderItems.find(o => o.key === orderKey) ?? orderItems[0];
    useNoteList.getState().setSelectedOrder(order);
  }, [selectedFolder])

  const setSelectedNote = useNote(state => state.setSelectedNote);
  const noteListState = useNoteList();
  const {onKeyDown, onCtrlClick, onShiftClick} = useKeyEventHandlers(notesRaw);

  console.log("NoteListView render");

  return (
    <div className={classNames(
      'flex flex-1 flex-col h-0 basis-80 md:flex-none md:h-full w-48 md:w-72',
      'bg-gray-100 dark:bg-gray-900 dark:text-gray-400',
      {'hidden': !showNoteListView},
    )}>
      {/*ヘッダー*/}
      <NoteListHeader noteCount={noteCount} folderId={selectedFolder?.id ?? -1} />

      {/* ロード中の場合 */}
      {isLoading && <div className="flex-grow p-2">loading...</div>}
      {!isLoading && notes.length === 0 && <div className="flex-grow p-2">no notes</div>}
      {!isLoading && notes.length > 0 && <ul id="note-list" className="flex-grow overflow-y-scroll">
        {notes?.map((note: any, i: number) => {
          return (
            <li key={note.name + "-" + i} id={`note-${i}`}>
              <NoteCard note={note}
                        noteListState={noteListState}
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
