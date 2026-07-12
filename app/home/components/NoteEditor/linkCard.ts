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
// OGP を取得できなかったカードの説明欄の値。これらはアーカイブ側の
// メタデータ (/api/archiveMeta) で自己修復を試みる
function isFallbackDesc(desc: string | null): boolean {
  return desc == null || desc === "" || desc === "（データなし）" || desc.startsWith("Error:");
}

type ArchiveMeta = { ready: boolean, title?: string | null, site?: string | null, desc?: string | null };

// ready になった結果だけキャッシュする（処理中は再試行したいため）
const archiveMetaCache = new Map<string, ArchiveMeta>();

async function fetchArchiveMeta(archiveId: string): Promise<ArchiveMeta | null> {
  const cached = archiveMetaCache.get(archiveId);
  if (cached != null) return cached;
  try {
    const res = await fetch(`/api/archiveMeta/${archiveId}`);
    if (!res.ok) return null;
    const data = (await res.json()) as ArchiveMeta | null;
    if (data?.ready === true) archiveMetaCache.set(archiveId, data);
    return data;
  } catch {
    return null;
  }
}

const HEAL_RETRY_MS = 15_000;
const HEAL_MAX_ATTEMPTS = 5;

const STYLE = `
  :host { display: block; }
  .card {
    max-width: 50em;
    margin: 0.1em;
    padding: 0.3em;
    border: 1px solid #777;
  }
  .site-row { display: flex; align-items: baseline; gap: 0.5em; }
  .site {
    flex: 1; min-width: 0;
    font-size: 0.9em; color: #777;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .archive { flex: none; font-size: 0.85em; color: #777; }
  .title-row { display: flex; align-items: baseline; gap: 0.5em; }
  .title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .divider { border-bottom: 1px solid #ccc; margin: 0.5em -0.3em; }
  /* 上寄せ: 展開時に概要・画像の位置が動かないようにする */
  .body { display: flex; align-items: flex-start; }
  .desc {
    flex: 1; min-width: 0;
    line-height: 1.5;
    height: 4.5em; /* 3行ぶんの固定高さ */
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    white-space: pre-wrap;
    cursor: text;
  }
  /* 展開時・編集中はクランプを外して全文を表示する */
  .card.expanded .desc, .desc:focus {
    display: block;
    height: auto;
    min-height: 4.5em;
    -webkit-line-clamp: unset;
  }
  .desc:focus { outline: 1px dashed #999; outline-offset: 2px; }
  .thumb {
    width: 80px; height: 80px; margin-left: 0.3em; flex: 0 0 80px;
    display: flex; align-items: flex-start; justify-content: flex-end;
  }
  .thumb img { max-width: 80px; max-height: 80px; width: auto; height: auto; object-fit: contain; }
  /* 引用ブロックは折りたたみ時は隠し、展開時のみ表示する */
  .quote { display: none; margin-top: 0.6em; padding: 0.45em; border: 1px solid #bbb; background: #fafafa; color: #222; }
  .card.expanded .quote { display: block; }
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
    private healAttempts = 0;
    private healTimer: ReturnType<typeof setTimeout> | null = null;
    // 概要の展開状態（表示上の状態で、保存はしない）
    private descExpanded = false;

    private toggleExpanded() {
      this.descExpanded = !this.descExpanded;
      this.shadowRoot?.querySelector(".card")?.classList.toggle("expanded", this.descExpanded);
    }

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
        // 本文 (概要・引用) のダブルクリックで展開/折りたたみを切り替える
        shadow.addEventListener("dblclick", (ev) => {
          if (!(ev.target instanceof Element)) return;
          if (ev.target.closest(".desc, .quote") == null) return;
          this.toggleExpanded();
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
      this.maybeHeal();
    }

    disconnectedCallback() {
      if (this.healTimer != null) {
        clearTimeout(this.healTimer);
        this.healTimer = null;
      }
    }

    attributeChangedCallback() {
      if (this.syncingDesc) return;
      if (this.shadowRoot != null) this.render();
    }

    // OGP 取得に失敗したカードを、アーカイブ側のメタデータで自動修復する。
    // アーカイブ処理中 (ready=false) はしばらく再試行する
    private async maybeHeal() {
      if (!isFallbackDesc(this.getAttribute("desc"))) return;
      const archiveId = this.getAttribute("archive")?.match(/^\d+$/)?.[0];
      if (archiveId == null || this.healAttempts >= HEAL_MAX_ATTEMPTS) return;
      this.healAttempts++;
      const meta = await fetchArchiveMeta(archiveId);
      if (!this.isConnected) return;
      if (meta?.ready === true) {
        // アーカイブ側もブロックページ等で説明文が取れていない場合は何もしない
        // （ブロックページのタイトルでカードを上書きしてしまうのを防ぐ）
        if (!meta.desc) return;
        if (meta.title) this.setAttribute("card-title", meta.title);
        if (meta.site) this.setAttribute("site", meta.site);
        this.setAttribute("desc", meta.desc);
        // 修復結果をノート本文の変更として通常の保存フローに乗せる
        this.dispatchEvent(new Event("input", {bubbles: true, composed: true}));
      } else if (meta?.ready === false) {
        this.healTimer = setTimeout(() => {
          this.healTimer = null;
          this.maybeHeal();
        }, HEAL_RETRY_MS);
      }
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
        `<div class="card${this.descExpanded ? " expanded" : ""}">` +
        `<div class="site-row"><span class="site" title="${escapeHtml(site)}">${escapeHtml(site)}</span>${archiveHtml}</div>` +
        `<div class="title-row">` +
        `<span class="title" title="${escapeHtml(title)}">${titleHtml}</span>` +
        `</div>` +
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
