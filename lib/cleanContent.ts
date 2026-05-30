const WHITE_BACKGROUND_STYLE = 'background-color: rgb(255 255 255/var(--tw-bg-opacity));';
const TAILWIND_CSS_VARIABLE_DECLARATION = /\s*--tw-[a-z0-9-]+:\s*[^;"]*;?/gi;

export function cleanContent(content: string): string {
  return content
    .replace(TAILWIND_CSS_VARIABLE_DECLARATION, '')
    .replaceAll(WHITE_BACKGROUND_STYLE, '')
    .replace(/\s*style=""/g, '');
}
