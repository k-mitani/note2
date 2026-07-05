type RenderFormat = "plain" | "markdown";

const INLINE_TAGS = new Set([
  "a",
  "abbr",
  "b",
  "bdi",
  "bdo",
  "cite",
  "code",
  "data",
  "dfn",
  "em",
  "i",
  "kbd",
  "mark",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "time",
  "u",
  "var",
]);
const RAW_TEXT_TAGS = new Set(["pre", "script", "style", "textarea"]);
const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);
const INDENT = "  ";

function normalizeText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseHtmlFragment(content: string): HTMLElement {
  const doc = new DOMParser().parseFromString(content, "text/html");
  return doc.body;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function getStartTag(element: Element): string {
  const tagName = element.tagName.toLowerCase();
  const attributes = element.getAttributeNames()
    .map(name => {
      const value = element.getAttribute(name);
      return value == null ? name : `${name}="${escapeAttribute(value)}"`;
    })
    .join(" ");
  return attributes.length > 0 ? `<${tagName} ${attributes}>` : `<${tagName}>`;
}

function getEndTag(element: Element): string {
  return `</${element.tagName.toLowerCase()}>`;
}

function renderPlainChildren(element: Element | DocumentFragment | HTMLElement): string {
  return Array.from(element.childNodes).map(renderPlainNode).join("");
}

function renderPlainBlock(element: Element): string {
  const text = renderPlainChildren(element).trim();
  return text ? `${text}\n\n` : "";
}

function renderPlainList(element: Element, ordered: boolean): string {
  const items = Array.from(element.children).filter(child => child.tagName.toLowerCase() === "li");
  return items.map((item, index) => {
    const text = renderPlainChildren(item).trim();
    const marker = ordered ? `${index + 1}.` : "-";
    return text ? `${marker} ${text}\n` : "";
  }).join("") + "\n";
}

function renderPlainNode(node: ChildNode): string {
  if (node.nodeType === 3) return node.textContent ?? "";
  if (node.nodeType !== 1) return "";

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();

  if (tagName === "br") return "\n";
  if (tagName === "hr") return "\n---\n\n";
  if (tagName === "ul") return renderPlainList(element, false);
  if (tagName === "ol") return renderPlainList(element, true);
  if (tagName === "li") {
    const text = renderPlainChildren(element).trim();
    return text ? `- ${text}\n` : "";
  }

  if (["div", "p", "section", "article", "header", "footer", "blockquote", "pre"].includes(tagName)) {
    return renderPlainBlock(element);
  }

  if (/^h[1-6]$/.test(tagName)) {
    return renderPlainBlock(element);
  }

  return renderPlainChildren(element);
}

function renderMarkdownChildren(element: Element | DocumentFragment | HTMLElement): string {
  return Array.from(element.childNodes).map(renderMarkdownNode).join("");
}

function renderMarkdownBlock(element: Element): string {
  const text = renderMarkdownChildren(element).trim();
  return text ? `${text}\n\n` : "";
}

function renderMarkdownList(element: Element, ordered: boolean): string {
  const items = Array.from(element.children).filter(child => child.tagName.toLowerCase() === "li");
  return items.map((item, index) => {
    const text = renderMarkdownChildren(item)
      .trim()
      .replace(/\n{2,}/g, "\n")
      .replace(/\n/g, "\n  ");
    const marker = ordered ? `${index + 1}.` : "-";
    return text ? `${marker} ${text}` : "";
  }).filter(Boolean).join("\n") + "\n\n";
}

function escapeMarkdownLabel(text: string): string {
  return text.replace(/([\\\[\]])/g, "\\$1");
}

function renderMarkdownNode(node: ChildNode): string {
  if (node.nodeType === 3) return node.textContent ?? "";
  if (node.nodeType !== 1) return "";

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();

  if (tagName === "br") return "\n";
  if (tagName === "hr") return "\n---\n\n";
  if (tagName === "ul") return renderMarkdownList(element, false);
  if (tagName === "ol") return renderMarkdownList(element, true);
  if (/^h[1-6]$/.test(tagName)) {
    const level = Number(tagName.substring(1));
    const text = renderMarkdownChildren(element).trim();
    return text ? `${"#".repeat(level)} ${text}\n\n` : "";
  }
  if (tagName === "blockquote") {
    const text = renderMarkdownChildren(element).trim();
    return text ? `${text.split("\n").map(line => `> ${line}`).join("\n")}\n\n` : "";
  }
  if (tagName === "pre") {
    const text = element.textContent ?? "";
    return text ? `\`\`\`\n${text.replace(/\n$/, "")}\n\`\`\`\n\n` : "";
  }
  if (tagName === "code") {
    const text = element.textContent ?? "";
    const fence = text.includes("`") ? "``" : "`";
    return text ? `${fence}${text}${fence}` : "";
  }
  if (tagName === "strong" || tagName === "b") {
    const text = renderMarkdownChildren(element).trim();
    return text ? `**${text}**` : "";
  }
  if (tagName === "em" || tagName === "i") {
    const text = renderMarkdownChildren(element).trim();
    return text ? `*${text}*` : "";
  }
  if (tagName === "a") {
    const href = element.getAttribute("href");
    const text = renderMarkdownChildren(element).trim();
    if (href == null || href.length === 0) return text;
    return `[${escapeMarkdownLabel(text || href)}](${href})`;
  }
  if (tagName === "img") {
    const src = element.getAttribute("src");
    if (src == null || src.length === 0) return "";
    const alt = element.getAttribute("alt") ?? "";
    return `![${escapeMarkdownLabel(alt)}](${src})`;
  }
  if (["div", "p", "section", "article", "header", "footer"].includes(tagName)) {
    return renderMarkdownBlock(element);
  }
  if (tagName === "li") {
    const text = renderMarkdownChildren(element).trim();
    return text ? `- ${text}\n` : "";
  }

  return renderMarkdownChildren(element);
}

function isTransparentWrapper(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  return (tagName === "div" || tagName === "span") && element.getAttributeNames().length === 0;
}

function canRenderAsTextLike(node: ChildNode): boolean {
  if (node.nodeType === 3) return true;
  if (node.nodeType !== 1) return false;

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();
  if (tagName === "br") return true;
  if (!isTransparentWrapper(element)) return false;

  return Array.from(element.childNodes).every(canRenderAsTextLike);
}

function renderTextLikeHtmlText(node: ChildNode): string {
  if (node.nodeType === 3) {
    return escapeHtml((node.textContent ?? "").replace(/[ \t\r\n]+/g, " "));
  }
  if (node.nodeType !== 1) return "";

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();
  if (tagName === "br") return "\n";

  const text = Array.from(element.childNodes).map(renderTextLikeHtmlText).join("");
  return tagName === "div" ? `${text.replace(/\n$/, "")}\n` : text;
}

function renderTextLikeHtmlNodes(nodes: ChildNode[], depth: number): string[] {
  const indent = INDENT.repeat(depth);
  return nodes
    .map(renderTextLikeHtmlText)
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n+$/g, "")
    .split("\n")
    .map(line => `${indent}${line.trimEnd()}`)
    .filter((line, index, lines) => line.trim().length > 0 || (index > 0 && index < lines.length - 1));
}

function canRenderInline(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  if (RAW_TEXT_TAGS.has(tagName) || VOID_TAGS.has(tagName)) return true;
  if (element.childNodes.length === 0) return true;

  return Array.from(element.childNodes).every(child => {
    if (child.nodeType === 3) return true;
    if (child.nodeType !== 1) return false;
    const childElement = child as Element;
    return INLINE_TAGS.has(childElement.tagName.toLowerCase()) || VOID_TAGS.has(childElement.tagName.toLowerCase());
  });
}

function renderInlineHtmlNode(node: ChildNode): string {
  if (node.nodeType === 3) {
    return escapeHtml((node.textContent ?? "").replace(/\s+/g, " "));
  }
  if (node.nodeType === 8) {
    return `<!--${node.textContent ?? ""}-->`;
  }
  if (node.nodeType !== 1) return "";

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();
  const startTag = getStartTag(element);
  if (tagName === "br") return "\n";
  if (VOID_TAGS.has(tagName)) return startTag;
  if (RAW_TEXT_TAGS.has(tagName)) {
    return `${startTag}${escapeHtml(element.textContent ?? "")}${getEndTag(element)}`;
  }
  return `${startTag}${Array.from(element.childNodes).map(renderInlineHtmlNode).join("")}${getEndTag(element)}`;
}

function renderHtmlNodes(nodes: ChildNode[], depth: number): string[] {
  const lines: string[] = [];
  let textLikeNodes: ChildNode[] = [];

  const flushTextLikeNodes = () => {
    if (textLikeNodes.length === 0) return;
    lines.push(...renderTextLikeHtmlNodes(textLikeNodes, depth));
    textLikeNodes = [];
  };

  for (const node of nodes) {
    if (canRenderAsTextLike(node)) {
      textLikeNodes.push(node);
      continue;
    }

    flushTextLikeNodes();
    lines.push(...renderHtmlNode(node, depth));
  }

  flushTextLikeNodes();
  return lines;
}

function renderHtmlNode(node: ChildNode, depth: number): string[] {
  const indent = INDENT.repeat(depth);
  if (node.nodeType === 3) {
    const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    return text.length > 0 ? [`${indent}${escapeHtml(text)}`] : [];
  }
  if (node.nodeType === 8) {
    return [`${indent}<!--${node.textContent ?? ""}-->`];
  }
  if (node.nodeType !== 1) return [];

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();

  if (isTransparentWrapper(element)) {
    return renderHtmlNodes(Array.from(element.childNodes), depth);
  }

  const startTag = getStartTag(element);
  if (tagName === "br") return [""];
  if (VOID_TAGS.has(tagName)) return [`${indent}${startTag}`];

  if (RAW_TEXT_TAGS.has(tagName)) {
    const text = escapeHtml(element.textContent ?? "");
    return [`${indent}${startTag}${text}${getEndTag(element)}`];
  }

  if (canRenderInline(element)) {
    const html = Array.from(element.childNodes).map(renderInlineHtmlNode).join("").trim();
    return [`${indent}${startTag}${html}${getEndTag(element)}`];
  }

  const childLines = renderHtmlNodes(Array.from(element.childNodes), depth + 1);
  if (childLines.length === 0) return [`${indent}${startTag}${getEndTag(element)}`];

  return [
    `${indent}${startTag}`,
    ...childLines,
    `${indent}${getEndTag(element)}`,
  ];
}

export function noteContentToPlainText(content: string): string {
  return normalizeText(renderPlainChildren(parseHtmlFragment(content)));
}

export function noteContentToMarkdown(content: string): string {
  return normalizeText(renderMarkdownChildren(parseHtmlFragment(content)));
}

export function getNoteContentCopyText(content: string, format: RenderFormat): string {
  if (format === "plain") return noteContentToPlainText(content);
  return noteContentToMarkdown(content);
}

export function noteContentToFormattedHtml(content: string): string {
  const body = parseHtmlFragment(content);
  return Array.from(body.childNodes)
    .flatMap(node => renderHtmlNode(node, 0))
    .join("\n")
    .trim();
}

export async function writeTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText != null) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}
