import classNames from "classnames";
import React from "react";
import {orderItems, getOrderName} from "@/app/home/components/NoteList/hooks";
import {useNoteList} from "@/app/home/components/NoteList/state";


export default function NoteListHeader({noteCount}: { noteCount: number }) {
  const showOrderItems = useNoteList(state => state.showOrderItems);
  const toggleShowOrderItems = useNoteList(state => state.toggleShowOrderItems);
  const orderName = getOrderName(useNoteList(state => state.selectedOrder));
  const setSelectedOrder = useNoteList(state => state.setSelectedOrder);
  const multiSelectionMode = useNoteList(state => state.multiSelectionMode);
  const toggleMultiSelectionMode = useNoteList(state => state.toggleMultiSelectionMode);
  const multiSelectionNotes = useNoteList(state => state.multiSelectionNotes);

  return (
    <div className={"flex-none p-1 border-b-2 border-gray-300 dark:border-gray-700"}>
      <h2>ノート一覧 ({noteCount})</h2>

      {/*ソート設定リスト*/}
      <span>
          <span className={classNames(
            "bg-white dark:bg-gray-800 border-2 border-gray-600",
            "block absolute ml-[-80px]",
            showOrderItems ? "" : " hidden",
          )}>
            <ul>
              {orderItems.map((order: any, i) =>
                <li key={i}
                    className={"hover:bg-blue-300 dark:hover:bg-blue-800 p-0.5 cursor-pointer"}
                    onClick={() => setSelectedOrder(i)}>{order[0]}</li>
              )}
            </ul>
          </span>
        </span>

      {/*ソートボタン*/}
      <button className={"text-sm m-1 p-0.5 bg-gray-500 text-white dark:bg-gray-600 dark:text-gray-300"}
              onClick={toggleShowOrderItems}>
        {orderName}
      </button>

      {/*表示形式*/}
      {/*<button className={"text-sm m-1 p-0.5 bg-gray-500 text-white"}>サマリー</button>*/}

      {/*複数選択*/}
      <button className={classNames(
        "text-sm m-1 w-16 p-0.5 bg-gray-500 text-white dark:bg-gray-600 dark:text-gray-300",
        multiSelectionMode ? "bg-blue-500" : "",
      )}
              onClick={toggleMultiSelectionMode}>選択 {multiSelectionMode && `(${multiSelectionNotes.v.size})`}
      </button>

      {/*検索*/}
      <input className={"m-1 border-2 dark:bg-gray-950 dark:border-gray-900"} type="text" placeholder="ノートを検索"/>
    </div>
  )
}