import {FaFolderClosed, FaList} from "react-icons/fa6";
import {useRecoilState} from "recoil";
import {atoms} from "@/app/home/atoms";
import {useRecoilLocalStorage} from "@/app/utils";

export function Header() {
  const [showSideBar, setShowSideBar] = useRecoilLocalStorage(atoms.showSideBar);
  const [showNoteListView, setShowNoteListView] = useRecoilLocalStorage(atoms.showNoteListView);

  return (
    <div className="flex bg-gray-800 p-1">
      <button className="rounded bg-gray-500 p-2 hover:bg-gray-400 content-center"
              onClick={() => setShowSideBar(!showSideBar)}>
        <FaFolderClosed color="white" className="w-10"/>
      </button>
      <button className="ms-1 rounded bg-gray-500 p-2 hover:bg-gray-400"
              onClick={() => setShowNoteListView(!showNoteListView)}>
        <FaList color="white" className="w-10"/>
      </button>
    </div>
  )
}