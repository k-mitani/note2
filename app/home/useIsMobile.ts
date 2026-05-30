import {useEffect, useState} from "react";

/**
 * 画面幅がモバイルサイズかどうかを返すフック。
 * Tailwindの `md` ブレークポイント(768px)未満をモバイルとみなす。
 *
 * SSR時とマウント前は `null` を返す（ハイドレーション不一致を避けるため）。
 * 呼び出し側は `null` を「まだ不明（＝PC扱い）」として扱うとよい。
 */
export function useIsMobile(query: string = "(max-width: 767px)"): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);

  return isMobile;
}
