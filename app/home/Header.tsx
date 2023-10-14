import {FaFloppyDisk, FaFolderClosed, FaList, FaSquarePlus, FaMoon, FaSun} from "react-icons/fa6";
import {useRecoilState} from "recoil";
import {atoms} from "@/app/home/atoms";
import {useRecoilLocalStorage} from "@/app/utils";
import classNames from "classnames";
import {useCallback, useEffect} from "react";
import {useLocalStorage} from "usehooks-ts";

export function Header({onCreateNewNote, saveChanges}: {
  onCreateNewNote: () => void,
  saveChanges: () => void,
}) {
  const [autoSave, setAutoSave] = useLocalStorage("autoSave", true);
  const [theme, setTheme] = useLocalStorage("theme", "");
  const themeIsDark = theme === "dark";
  const [showSideBar, setShowSideBar] = useRecoilLocalStorage(atoms.showSideBar);
  const [showNoteListView, setShowNoteListView] = useRecoilLocalStorage(atoms.showNoteListView);
  const [[changedNotes], setChangedNotes] = useRecoilState(atoms.changedNotes);

  useEffect(() => {
    if (themeIsDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [themeIsDark]);

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
    <div className="flex bg-gray-800 dark:bg-gray-900 p-1 text-white dark:text-gray-400">
      <div className="md:block hidden">
        <button className="rounded bg-gray-500 dark:bg-gray-700 p-2 w-14 hover:bg-gray-400 content-center"
                onClick={() => setShowSideBar(!showSideBar)}>
          <FaFolderClosed className="m-auto"/>
        </button>
        <button className="ms-1 rounded bg-gray-500 dark:bg-gray-700 p-2 w-14 hover:bg-gray-400"
                onClick={() => setShowNoteListView(!showNoteListView)}>
          <FaList className="m-auto"/>
        </button>
      </div>
      <button className="rounded bg-gray-500 dark:bg-gray-700 p-2 w-[115px] hover:bg-gray-400 content-center md:hidden"
              onClick={() => {
                setShowSideBar(!showSideBar);
                setShowNoteListView(!showNoteListView);
              }}>
        <FaFolderClosed className="m-auto"/>
      </button>

      <button className="ms-16 rounded bg-gray-500 dark:bg-gray-700 p-2 w-24 hover:bg-gray-400"
              onClick={onCreateNewNote}>
        <FaSquarePlus className="m-auto"/>
      </button>

      <button className={classNames("ms-1 rounded p-2 w-14",
        changedNotes.size === 0 ? "bg-gray-900 dark:bg-gray-800" : "bg-gray-500 hover:bg-gray-400  dark:bg-gray-700"
      )}
              onClick={saveChanges}>
        <div className="flex relative">
          <FaFloppyDisk className="m-auto"></FaFloppyDisk>
          {/*<span className="absolute text-white right-0"> {changedNotes.size}</span>*/}
        </div>
      </button>

      <button className="ms-1 text-sm" onClick={() => setAutoSave(!autoSave)}>
        <input className="align-middle" type="checkbox" checked={autoSave}/>
        <span className="align-middle">自動保存</span>
      </button>

      <button className="ms-16 rounded bg-gray-500 dark:bg-gray-700 p-2 w-24 hover:bg-gray-400"
              onClick={() => themeIsDark ? setTheme("") : setTheme("dark")}>
        {themeIsDark ?
          <FaSun className="m-auto"/> :
          <FaMoon className="m-auto"/>
        }
      </button>

    </div>
  )
}