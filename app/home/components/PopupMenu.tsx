import React, {useEffect, useLayoutEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";

/** ポップアップメニュー内の1項目。 */
export function PopupMenuItem(
  {label, onClick, danger = false}: {
    label: string,
    onClick: () => void,
    danger?: boolean,
  }) {
  return (
    <button
      type="button"
      className={
        "flex w-full items-center px-3 py-1.5 text-start text-sm cursor-pointer " +
        "hover:bg-gray-100 dark:hover:bg-gray-700 " +
        (danger ? "text-red-600 dark:text-red-400" : "text-gray-800 dark:text-gray-200")
      }
      // メニューの onMouseDown(外側クリック判定)より先に拾われないよう click で実行する。
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/** 項目間の区切り線。 */
export function PopupMenuSeparator() {
  return <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />;
}

/**
 * カーソル位置に表示する汎用ポップアップメニュー。
 * - body 直下にポータルで描画し、重なり順(z-index)を確保する。
 * - 画面外にはみ出す場合は内側に位置を補正する。
 * - 外側クリック / Esc / スクロール / リサイズで閉じる。
 */
export function PopupMenu(
  {x, y, onClose, children}: {
    x: number,
    y: number,
    onClose: () => void,
    children: React.ReactNode,
  }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({x, y});

  // メニューサイズを測り、画面外にはみ出さないよう位置を補正する。
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const {width, height} = el.getBoundingClientRect();
    const margin = 8;
    const nextX = Math.min(x, window.innerWidth - width - margin);
    const nextY = Math.min(y, window.innerHeight - height - margin);
    setPos({x: Math.max(margin, nextX), y: Math.max(margin, nextY)});
  }, [x, y]);

  // 外側クリック・Esc・スクロール・リサイズで閉じる。
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      role="menu"
      className={
        "fixed z-50 min-w-40 py-1 rounded-md shadow-lg " +
        "bg-white dark:bg-gray-800 " +
        "border border-gray-200 dark:border-gray-700 " +
        "text-black dark:text-gray-200"
      }
      style={{top: pos.y, left: pos.x}}
      // メニュー内のクリックがカード選択など下層へ伝播しないようにする。
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>,
    document.body
  );
}
