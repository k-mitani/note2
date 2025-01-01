import {useEffect, useState} from "react";

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