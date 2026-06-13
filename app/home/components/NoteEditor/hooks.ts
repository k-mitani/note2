import React, {useEffect, useState} from "react";

/** IMEのポップアップが表示されているかどうかを返すフック */
export function useShowingImePopup(): boolean {
  const [isComposing, setIsComposing] = useState(false);
  useEffect(() => {
    const handleCompositionStart = () => {
      setIsComposing(true);
    };
    const handleCompositionEnd = () => {
      setIsComposing(false);
    };
    document.addEventListener('compositionstart', handleCompositionStart);
    document.addEventListener('compositionend', handleCompositionEnd);
    return () => {
      document.removeEventListener('compositionstart', handleCompositionStart);
      document.removeEventListener('compositionend', handleCompositionEnd);
    };
  }, [isComposing]);

  return isComposing;
}

export function useEnableImageResize(note: unknown) {
  // note を依存に含めることで、ノート選択直後はまだ ContentEditable が
  // マウントされていない（読み込み中のloading表示）場合でも、本文が
  // 表示されたタイミングで再実行してリスナーを取り付け直す。
  // パーマリンク復元時に editable が null で addEventListener が落ちるのを防ぐ。
  useEffect(() => {
    const editable = document.getElementById("NoteEditor-ContentEditable");
    if (editable == null) return;

    let activeImage: HTMLImageElement | null = null;
    let isResizing = false;
    let currentX = 0;
    let currentY = 0;
    let initialWidth = 0;
    let initialHeight = 0;

    function onMouseDown(ev: MouseEvent) {
      if ((ev.target as HTMLElement)?.tagName !== 'IMG') return;
      // 画像の端（右下）付近でクリックされた場合のみリサイズを開始
      const img = ev.target as HTMLImageElement;
      const rect = img.getBoundingClientRect();
      const edgeSize = 30; // リサイズを開始する端からの距離（ピクセル）

      if (ev.clientX > rect.right - edgeSize &&
        ev.clientY > rect.bottom - edgeSize) {

        isResizing = true;
        activeImage = ev.target as HTMLImageElement;
        currentX = ev.clientX;
        currentY = ev.clientY;
        initialWidth = activeImage.offsetWidth;
        initialHeight = activeImage.offsetHeight;

        // カーソルスタイルを変更
        activeImage.style.cursor = 'se-resize';

        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);

        // デフォルトのドラッグ動作を防止
        ev.preventDefault();
      }
    }

    function resize(ev: MouseEvent) {
      if (!isResizing) return;

      const deltaX = ev.clientX - currentX;
      const deltaY = ev.clientY - currentY;

      // アスペクト比を維持してリサイズ
      const aspect = initialWidth / initialHeight;
      const newWidth = Math.max(50, initialWidth + deltaX); // 最小サイズを設定

      activeImage!.style.width = newWidth + 'px';
      activeImage!.style.height = (newWidth / aspect) + 'px';
    }

    function stopResize() {
      if (isResizing && activeImage) {
        activeImage.style.cursor = 'default';
        isResizing = false;
        activeImage = null;
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
      }
    }

    // ホバー時のカーソル表示
    function onMouseMove(ev: MouseEvent) {
      if ((ev.target as HTMLElement)?.tagName === 'IMG') {
        const img = ev.target as HTMLImageElement;
        const rect = img.getBoundingClientRect();
        const edgeSize = 20;

        if (ev.clientX > rect.right - edgeSize &&
          ev.clientY > rect.bottom - edgeSize) {
          img.style.cursor = 'se-resize';
        } else {
          img.style.cursor = 'default';
        }
      }
    }

    editable.addEventListener('mousedown', onMouseDown);
    editable.addEventListener('mousemove', onMouseMove);

    return () => {
      editable.removeEventListener('mousedown', onMouseDown);
      editable.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousemove', resize);
      document.removeEventListener('mouseup', stopResize);
    };
  }, [note]);
}

/**
 * contenteditable内ではアンカーをクリックしてもデフォルトでは遷移しないため、
 * リンク部分のクリックを検知して別タブで開く。
 * リファラーは付けない（rel=noreferrer 相当）。
 */
export function onClickContent(ev: React.MouseEvent<HTMLDivElement>) {
  const target = ev.target as HTMLElement;
  const anchor = target.closest("a");
  if (anchor == null) return;
  const href = anchor.getAttribute("href");
  if (!href) return;
  ev.preventDefault();
  window.open(href, "_blank", "noopener,noreferrer");
}

export async function onPaste(ev: React.ClipboardEvent<HTMLDivElement>) {
  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    let bytes = new Uint8Array(buffer);
    let len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // 添付ファイルありの場合
  if (ev.clipboardData.files.length > 0) {
    ev.preventDefault();
    // await後はev.currentTargetがnull化されるため、要素参照を先に取得しておく。
    const editable = document.getElementById("NoteEditor-ContentEditable");
    for (let file of ev.clipboardData.files) {
      if (file.type.includes("image/")) {
        const data = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(data);
        const src = `data:image/png;base64,${base64}`;
        const img = document.createElement("img");
        img.src = src;
        // document.execCommand("insertHTML", false, img.outerHTML);
        const range = document.getSelection()!.getRangeAt(0);
        range.insertNode(img);
        range.collapse();

        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/rpc/uploadFile", {
          method: "POST",
          body: formData,
        });
        const url = await res.json();
        img.src = url;
        console.log("url2", url);
        // img.srcのプログラム的な更新ではContentEditableのonChangeが発火せず、
        // changedNotes/refHtmlにdata URLが残ってしまう。input イベントを発火させて
        // S3 URL化済みのinnerHTMLを変更内容として確定させる。
        editable?.dispatchEvent(new Event("input", {bubbles: true}));
      }
    }
    return;
  }
}