import classNames from "classnames";
import React from "react";
import {orderItems} from "@/app/home/components/NoteList/NoteListOrder";
import {useNoteList} from "@/app/home/components/NoteList/state";
import * as utils from "@/app/utils";
import {
  getNextViewMode,
  NOTE_LIST_VIEW_MODE_TITLE_ONLY,
} from "@/app/home/components/NoteList/NoteListViewMode";
import {mutate} from "swr";
import {FaBars, FaListUl, FaRectangleList} from "react-icons/fa6";


export default function NoteListHeader({folderId}: { folderId: number }) {
  const showOrderItems = useNoteList(state => state.showOrderItems);
  const toggleShowOrderItems = useNoteList(state => state.toggleShowOrderItems);
  const orderName = useNoteList(state => state.selectedOrder).label;
  const setSelectedOrder = useNoteList(state => state.setSelectedOrder);
  const selectedViewMode = useNoteList(state => state.selectedViewMode);
  const setSelectedViewMode = useNoteList(state => state.setSelectedViewMode);
  const multiSelectionMode = useNoteList(state => state.multiSelectionMode);
  const toggleMultiSelectionMode = useNoteList(state => state.toggleMultiSelectionMode);
  const multiSelectionNotes = useNoteList(state => state.multiSelectionNotes);
  const searchQuery = useNoteList(state => state.searchQuery);
  const setSearchQuery = useNoteList(state => state.setSearchQuery);
  const isTitleOnly = selectedViewMode.key === NOTE_LIST_VIEW_MODE_TITLE_ONLY;

  const toggleViewMode = async () => {
    const nextViewMode = getNextViewMode(selectedViewMode);
    setSelectedViewMode(nextViewMode);
    await utils.putJson(`/api/folders/${folderId}/updateNoteListViewMode`, {
      noteListViewMode: nextViewMode.key,
    });
    mutate("/api/rpc/getFoldersAll");
  };

  return (
    <div className={"relative flex flex-none items-center gap-1 p-1 border-b-2 border-gray-300 dark:border-gray-700"}>
      {/*検索*/}
      <input
        className={"min-w-0 flex-1 border-2 px-1 py-0.5 dark:bg-gray-950 dark:border-gray-900"}
        type="text"
        placeholder="ノートを検索"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <button
        type="button"
        className={"shrink-0 rounded bg-gray-500 p-2 text-white hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-300"}
        title={`表示形式: ${selectedViewMode.label}`}
        aria-label={`表示形式: ${selectedViewMode.label}`}
        onClick={toggleViewMode}
      >
        {isTitleOnly ? <FaListUl/> : <FaRectangleList/>}
      </button>

      <button
        type="button"
        className={"shrink-0 rounded bg-gray-500 p-2 text-white hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-300"}
        aria-label="ノート一覧メニュー"
        onClick={toggleShowOrderItems}
      >
        <FaBars/>
      </button>

      <div className={classNames(
        "absolute right-1 top-full z-20 mt-1 w-44 border-2 border-gray-600 bg-white shadow-lg dark:bg-gray-800",
        showOrderItems ? "" : "hidden",
      )}>
        <div className="border-b border-gray-300 px-2 py-1 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          並び替え: {orderName}
        </div>
        <ul>
          {orderItems.map((order, i) =>
            <li key={i}>
              <button
                type="button"
                className={classNames(
                  "block w-full px-2 py-1 text-left text-sm hover:bg-blue-300 dark:hover:bg-blue-800",
                  order.label === orderName ? "bg-blue-100 dark:bg-blue-950" : "",
                )}
                onClick={async () => {
                  setSelectedOrder(order);
                  await utils.putJson(`/api/folders/${folderId}/updateOrder`, {order: order.key});
                  toggleShowOrderItems();
                }}
              >
                {order.label}
              </button>
            </li>
          )}
        </ul>

        <button
          type="button"
          className={classNames(
            "block w-full border-t border-gray-300 px-2 py-1 text-left text-sm hover:bg-blue-300 dark:border-gray-700 dark:hover:bg-blue-800",
            multiSelectionMode ? "bg-blue-100 dark:bg-blue-950" : "",
          )}
          onClick={() => {
            toggleMultiSelectionMode();
            toggleShowOrderItems();
          }}
        >
          選択 {multiSelectionMode && `(${multiSelectionNotes.v.size})`}
        </button>
      </div>
    </div>
  )
}
