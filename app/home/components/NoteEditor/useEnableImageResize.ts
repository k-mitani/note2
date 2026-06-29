import {useEffect} from "react";

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
