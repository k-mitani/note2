import {FaFloppyDisk, FaFolderClosed, FaList, FaSquarePlus, FaMoon, FaSun, FaGear} from "react-icons/fa6";
import {useNote, useLocalPreferences} from "@/app/home/state";
import classNames from "classnames";
import {useCallback, useEffect} from "react";
import {useLocalStorage} from "usehooks-ts";
import {useOnCreateNewNote, useOnDropToFolder, useSaveChanges} from "@/app/home/hooks";
import {useSetting} from "@/app/home/components/Setting/state";

export function Header() {
  const [theme, setTheme] = useLocalStorage("theme", "");
  const themeIsDark = theme === "dark";
  const openSetting = useSetting(state => state.open);

  const [changedNotes] = useNote(state => state.changedNotes);

  const showSideBar = useLocalPreferences(state => state.showSideBar);
  const showNoteListView = useLocalPreferences(state => state.showNoteListView);
  const setShowSideBar = useLocalPreferences(state => state.setShowSideBar);
  const setShowNoteListView = useLocalPreferences(state => state.setShowNoteListView);

  const selectedFolder = useNote(state => state.selectedFolder);
  const saveChanges = useSaveChanges(selectedFolder?.id);
  const onCreateNewNote = useOnCreateNewNote(selectedFolder?.id);

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
    <div className="flex bg-gray-800 dark:bg-neutral-900 p-1 text-white dark:text-gray-400">
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
      <button className="rounded bg-gray-500 dark:bg-gray-700 p-2 w-20 hover:bg-gray-400 content-center md:hidden"
              onClick={() => {
                setShowSideBar(!showSideBar);
                setShowNoteListView(!showNoteListView);
              }}>
        <FaFolderClosed className="m-auto"/>
      </button>

      <button className="ms-6 md:ms-16 rounded bg-gray-500 dark:bg-gray-700 p-2 w-20 md:w-24 hover:bg-gray-400"
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

      <div className="ml-auto">
        <button className="rounded bg-gray-500 dark:bg-gray-700 p-2 w-14 hover:bg-gray-400 mr-1"
                onClick={openSetting}>
          <FaGear className="m-auto"/>
        </button>

        <button className="rounded bg-gray-500 dark:bg-gray-700 p-2 w-14 hover:bg-gray-400"
                onClick={() => themeIsDark ? setTheme("") : setTheme("dark")}>
          {themeIsDark ?
            <FaSun className="m-auto"/> :
            <FaMoon className="m-auto"/>
          }
        </button>
      </div>
    </div>
  )
}