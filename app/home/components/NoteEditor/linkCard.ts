// <link-card> カスタム要素。
//
// ノート本文に保存されるのは属性の意味データと最小限のフォールバック <a> だけで、
// カードの見た目は表示時にこの要素が Shadow DOM 内へ描画する。
// Shadow DOM は innerHTML にシリアライズされないため保存内容に描画結果は混ざらず、
// カードの形式変更はこのファイルの修正だけで済む（保存済みノートの書き換え不要）。
//
// 保存形式（タグ生成は lib/linkPreview.ts の renderLinkCardHtml）:
// <link-card contenteditable="false" url="..." site="..." card-title="..."
//            desc="..." img="..." archive="123" quote='{"site":...,"url":...,"title":...,"desc":...}'>
//   <a href="...">タイトル</a>  ← summary・全文検索・要素未定義環境用のフォールバック
// </link-card>
// ※ title でなく card-title なのは、グローバル属性 title のツールチップを避けるため

type QuoteData = { site?: string, url?: string, title?: string, desc?: string };

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeHttpUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

// 装飾は :host でなく内側の .card に当てる。ホスト要素は light DOM 側にいるため
// ページの CSS (Tailwind プリフライトの `* { border: 0 }` 等) に上書きされるが、
// Shadow DOM 内部の要素には外側のスタイルが届かない。
const STYLE = `
  :host { display: block; }
  .card {
    max-width: 50em;
    margin: 0.1em;
    padding: 0.3em;
    border: 1px solid #777;
  }
  .site { font-size: 0.9em; color: #777; }
  .archive { font-size: 0.85em; color: #777; }
  .divider { border-bottom: 1px solid #ccc; margin: 0.5em -0.3em; }
  .body { display: flex; align-items: center; }
  .desc { flex: 1; min-width: 0; white-space: pre-wrap; min-height: 1.2em; cursor: text; }
  .desc:focus { outline: 1px dashed #999; outline-offset: 2px; }
  .thumb {
    width: 80px; height: 80px; margin-left: 0.3em; flex: 0 0 80px;
    display: flex; align-items: center; justify-content: flex-end;
  }
  .thumb img { max-width: 80px; max-height: 80px; width: auto; height: auto; object-fit: contain; }
  .quote { margin-top: 0.6em; padding: 0.45em; border: 1px solid #bbb; background: #fafafa; color: #222; }
  .q-site { font-size: 0.85em; color: #777; }
  .q-desc { margin-top: 0.35em; white-space: pre-wrap; }
`;

/** <link-card> を定義する。クライアント側で一度だけ呼ぶ（SSR中は何もしない）。 */
export function defineLinkCard() {
  if (typeof window === "undefined" || customElements.get("link-card") != null) return;

  // 概要欄はプレーンテキストとして編集させる（未対応ブラウザは通常の編集にフォールバック）
  const descEditableMode = (() => {
    const div = document.createElement("div");
    try {
      div.contentEditable = "plaintext-only";
      return "plaintext-only";
    } catch {
      return "true";
    }
  })();

  class LinkCardElement extends HTMLElement {
    static observedAttributes = ["url", "site", "card-title", "desc", "img", "archive", "quote"];

    // 概要欄の編集を desc 属性へ同期している間は再描画しない（キャレットが消えるため）
    private syncingDesc = false;

    connectedCallback() {
      // エディタ内でアトミックな1ブロックとして扱わせる（カード内部は編集不可）
      if (this.getAttribute("contenteditable") !== "false") {
        this.setAttribute("contenteditable", "false");
      }
      if (this.shadowRoot == null) {
        const shadow = this.attachShadow({mode: "open"});
        // contenteditable 内ではアンカーのデフォルト遷移が効かず、Shadow DOM 内の
        // クリックは本文側ハンドラ (linkHandlers) からも見えないため、ここで別タブで開く
        shadow.addEventListener("click", (ev) => {
          if (!(ev.target instanceof Element)) return;
          const href = ev.target.closest("a")?.getAttribute("href");
          if (!href) return;
          ev.preventDefault();
          ev.stopPropagation();
          window.open(href, "_blank", "noopener,noreferrer");
        });
        // 概要欄の編集内容を desc 属性に反映する。input イベントは composed なので
        // このあと外側の ContentEditable にも届き、通常の変更検知・保存フローに乗る
        shadow.addEventListener("input", () => {
          const desc = shadow.querySelector<HTMLElement>(".desc");
          if (desc == null) return;
          this.syncingDesc = true;
          const text = desc.innerText.replace(/\n$/, "");
          if (text === "") this.removeAttribute("desc");
          else this.setAttribute("desc", text);
          this.syncingDesc = false;
        });
      }
      this.render();
    }

    attributeChangedCallback() {
      if (this.syncingDesc) return;
      if (this.shadowRoot != null) this.render();
    }

    private render() {
      const url = safeHttpUrl(this.getAttribute("url"));
      const site = this.getAttribute("site") ?? "";
      const title = this.getAttribute("card-title") || url || "(no title)";
      const desc = this.getAttribute("desc") ?? "";
      const img = safeHttpUrl(this.getAttribute("img"));
      const archiveId = this.getAttribute("archive")?.match(/^\d+$/)?.[0] ?? null;
      let quote: QuoteData | null = null;
      const quoteRaw = this.getAttribute("quote");
      if (quoteRaw) {
        try {
          quote = JSON.parse(quoteRaw);
        } catch {
          // 属性が壊れていても引用なしで表示は続ける
        }
      }

      const titleHtml = url != null
        ? `<a href="${escapeHtml(url)}" rel="noreferrer">${escapeHtml(title)}</a>`
        : escapeHtml(title);
      const archiveHtml = archiveId != null
        ? ` <a class="archive" href="/archive/${archiveId}" rel="noreferrer">(archive)</a>`
        : "";
      const imgHtml = img != null
        ? `<div class="thumb"><img src="${escapeHtml(img)}" alt="" referrerpolicy="no-referrer"></div>`
        : "";
      let quoteHtml = "";
      if (quote != null) {
        const quoteUrl = safeHttpUrl(quote.url ?? null);
        const quoteTitle = quote.title ?? quoteUrl ?? "";
        quoteHtml =
          `<div class="quote">` +
          `<div class="q-site">引用 / ${escapeHtml(quote.site ?? "X")}</div>` +
          `<div>` +
          (quoteUrl != null
            ? `<a href="${escapeHtml(quoteUrl)}" rel="noreferrer">${escapeHtml(quoteTitle)}</a>`
            : escapeHtml(quoteTitle)) +
          `</div>` +
          `<div class="q-desc">${escapeHtml(quote.desc ?? "")}</div>` +
          `</div>`;
      }

      this.shadowRoot!.innerHTML =
        `<style>${STYLE}</style>` +
        `<div class="card">` +
        `<div class="site">${escapeHtml(site)}</div>` +
        `<div>${titleHtml}${archiveHtml}</div>` +
        `<div class="divider"></div>` +
        `<div class="body">` +
        `<div class="desc" contenteditable="${descEditableMode}" spellcheck="false">${escapeHtml(desc)}</div>` +
        `${imgHtml}</div>` +
        quoteHtml +
        `</div>`;
    }
  }

  customElements.define("link-card", LinkCardElement);
}
