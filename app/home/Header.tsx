import {FaFloppyDisk, FaFolderClosed, FaList, FaSquarePlus} from "react-icons/fa6";
import {useRecoilState} from "recoil";
import {atoms} from "@/app/home/atoms";
import {useRecoilLocalStorage} from "@/app/utils";
import classNames from "classnames";
import {useCallback, useEffect} from "react";

export function Header({onCreateNewNote, saveChanges}: {
  onCreateNewNote: () => void,
  saveChanges: () => void,
}) {
  const [showSideBar, setShowSideBar] = useRecoilLocalStorage(atoms.showSideBar);
  const [showNoteListView, setShowNoteListView] = useRecoilLocalStorage(atoms.showNoteListView);
  const [[changedNotes], setChangedNotes] = useRecoilState(atoms.changedNotes);

  // ページ離脱時に、変更されたノートがあれば保存確認を行う。
  const onBeforeUnload = useCallback((ev: BeforeUnloadEvent) => {
    if (changedNotes.size === 0) return;
    ev.preventDefault();
    ev.returnValue = "unsaved changes";
  }, [changedNotes]);
  useEffect(() => {
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [onBeforeUnload]);

  return (
    <div className="flex bg-gray-800 p-1">
      <button className="rounded bg-gray-500 p-2 w-14 hover:bg-gray-400 content-center"
              onClick={() => setShowSideBar(!showSideBar)}>
        <FaFolderClosed color="white" className="m-auto"/>
      </button>
      <button className="ms-1 rounded bg-gray-500 p-2 w-14 hover:bg-gray-400"
              onClick={() => setShowNoteListView(!showNoteListView)}>
        <FaList color="white" className="m-auto"/>
      </button>

      <button className="ms-16 rounded bg-gray-500 p-2 w-14 hover:bg-gray-400"
              onClick={onCreateNewNote}>
        <FaSquarePlus color="white" className="m-auto"/>
      </button>

      <button className={classNames("ms-1 rounded p-2 w-14",
        changedNotes.size === 0 ? "bg-gray-900" : "bg-gray-500 hover:bg-gray-400"
      )}
              onClick={saveChanges}>
        <div className="flex relative">
          <FaFloppyDisk color="white" className="m-auto"></FaFloppyDisk>
          {/*<span className="absolute text-white right-0"> {changedNotes.size}</span>*/}
        </div>
      </button>

    </div>
  )
}