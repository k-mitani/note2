// <note-ref> カスタム要素。
//
// ノート本文には <note-ref note="123">@123</note-ref> だけを保存し、
// 表示時に現在のノートタイトルを取得して Shadow DOM 内に描画する。
// リンク先ノートを改名しても常に最新タイトルで表示され、
// 削除されていれば打ち消し線付きで示す。
// 子テキスト (@123) は summary・全文検索・要素未定義環境用のフォールバック。
//
// 色は globals.css の note-ref 向け CSS 変数 (ライト/ダーク) を参照する。
import {fetchNoteRefPreview} from "@/app/home/components/NoteEditor/noteRef/data";
import {navigateToNote} from "@/app/home/components/NoteEditor/noteRef/dom";

const STYLE = `
  :host { display: inline; }
  a {
    border-bottom: 1px dotted currentColor;
    border-radius: 3px;
    background: var(--note-ref-bg, rgb(37 99 235 / 0.08));
    color: var(--note-ref-color, #1d4ed8);
    padding: 0 0.15em;
    text-decoration: none;
    cursor: pointer;
  }
  a.missing { text-decoration: line-through; opacity: 0.65; }
`;

export function defineNoteRef() {
  if (typeof window === "undefined" || customElements.get("note-ref") != null) return;

  class NoteRefElement extends HTMLElement {
    static observedAttributes = ["note"];

    connectedCallback() {
      if (this.getAttribute("contenteditable") !== "false") {
        this.setAttribute("contenteditable", "false");
      }
      if (this.shadowRoot == null) {
        const shadow = this.attachShadow({mode: "open"});
        // アプリ内遷移 (linkHandlers と同じ挙動)。propagation は止めず、
        // 外側のツールチップ非表示などのハンドラにも届かせる
        shadow.addEventListener("click", (ev) => {
          const noteId = this.noteId;
          if (noteId == null) return;
          ev.preventDefault();
          navigateToNote(noteId);
        });
      }
      this.render();
    }

    attributeChangedCallback() {
      if (this.shadowRoot != null) this.render();
    }

    get noteId(): number | null {
      const raw = this.getAttribute("note") ?? "";
      if (!/^\d+$/.test(raw)) return null;
      const id = Number(raw);
      return Number.isSafeInteger(id) && id > 0 ? id : null;
    }

    private render() {
      const shadow = this.shadowRoot!;
      const noteId = this.noteId;
      if (noteId == null) {
        shadow.innerHTML = `<style>${STYLE}</style><a class="missing">@?</a>`;
        return;
      }
      // タイトル取得までは @id を表示しておく
      shadow.innerHTML = `<style>${STYLE}</style><a href="/home/${noteId}">@${noteId}</a>`;
      const anchor = shadow.querySelector("a")!;
      fetchNoteRefPreview(noteId)
        .then((preview) => {
          // 取得中に note 属性が変わった / 再描画された場合は反映しない
          if (this.noteId !== noteId || shadow.querySelector("a") !== anchor) return;
          if (preview == null) {
            anchor.classList.add("missing");
            anchor.textContent = `@${noteId}（削除済み）`;
          } else {
            anchor.textContent = preview.title;
          }
        })
        .catch(() => {
          // 取得失敗時は @id 表示のまま
        });
    }
  }

  customElements.define("note-ref", NoteRefElement);
}
