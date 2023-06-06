import {useState} from "react";
import {falseTag} from "yaml/dist/schema/yaml-1.1/bool";
import {bool} from "prop-types";

/**
 * スタックやノートを表示する。
 */
export default function SideBar({stacks, selectedNotebook, setSelectedNotebook}: any) {
  const [openState, setOpenState] = useState({} as any);
  return (
    <div className='p-2 flex-none w-72 bg-gray-700 text-white h-screen overflow-y-scroll'>
      <ul>
        <li>
          <button>新規ノートブック</button>
        </li>
        <li>
          <button>ショートカット</button>
        </li>
        <li>
          <button>全てのノート</button>
        </li>
      </ul>
      <ul className='mt-4'>
        {stacks.map((stack: any) => {
          return (
            <li key={stack.name} className='notebooks__stack'>
              <strong className={"block hover:bg-gray-500 cursor-pointer"}
                      onClick={() => openState[stack.name] ?
                        setOpenState({...openState, [stack.name]: false}) :
                        setOpenState({...openState, [stack.name]: true})
                      }>
                {openState[stack.name] ? "▶" : "▼"}
                📘{stack.name}
              </strong>
              <ul className={[
                (openState[stack.name] ? "hidden" : ""),
              ].join(" ")}>
                {stack.notebooks.map((notebook: any) => {
                  return <li
                    key={stack.name + notebook.name}
                    onClick={() => setSelectedNotebook(notebook)}
                    className={[
                      (selectedNotebook?.name === notebook.name ? "bg-gray-500" : "hover:bg-gray-600"),
                      "ps-5",
                      "cursor-pointer"
                    ].join(" ")}>
                    {notebook.name}
                  </li>
                })}
              </ul>
            </li>
          );
        })}
      </ ul>
    </div>
  )
}