import {prisma} from '@/lib/prisma';
import {NextRequest, NextResponse} from "next/server";

/**
 * ノートのコンテンツから不要なスタイルを削除する
 * TailwindのCSS変数などがコピペ時に混入するのを防ぐ
 */
function cleanContent(content: string): string {
  return content
    // Tailwind CSS変数を削除
    .replace(/--tw-border-spacing-x: 0; --tw-border-spacing-y: 0; --tw-translate-x: 0; --tw-translate-y: 0; --tw-rotate: 0; --tw-skew-x: 0; --tw-skew-y: 0; --tw-scale-x: 1; --tw-scale-y: 1; --tw-pan-x: ; --tw-pan-y: ; --tw-pinch-zoom: ; --tw-scroll-snap-strictness: proximity; --tw-gradient-from-position: ; --tw-gradient-via-position: ; --tw-gradient-to-position: ; --tw-ordinal: ; --tw-slashed-zero: ; --tw-numeric-figure: ; --tw-numeric-spacing: ; --tw-numeric-fraction: ; --tw-ring-inset: ; --tw-ring-offset-width: 0px; --tw-ring-offset-color: #fff; --tw-ring-color: rgba\(59,130,246,.5\); --tw-ring-offset-shadow: 0 0 #0000; --tw-ring-shadow: 0 0 #0000; --tw-shadow: 0 0 #0000; --tw-shadow-colored: 0 0 #0000; --tw-blur: ; --tw-brightness: ; --tw-contrast: ; --tw-grayscale: ; --tw-hue-rotate: ; --tw-invert: ; --tw-saturate: ; --tw-sepia: ; --tw-drop-shadow: ; --tw-backdrop-blur: ; --tw-backdrop-brightness: ; --tw-backdrop-contrast: ; --tw-backdrop-grayscale: ; --tw-backdrop-hue-rotate: ; --tw-backdrop-invert: ; --tw-backdrop-opacity: ; --tw-backdrop-saturate: ; --tw-backdrop-sepia: ;/g, '')
    // 背景色スタイルを削除
    .replace(/background-color: rgb\(255 255 255\/var\(--tw-bg-opacity\)\);/g, '')
    // 空のstyle属性を削除
    .replace(/\s*style=""/g, '');
}

export async function POST(
  req: NextRequest,
  {params}: { params: any },
) {
  const {notes} = await req.json();
  const res = await prisma.$transaction(notes.map((note: any) => {
  const updatedAt = note.updatedAt || new Date();
    return prisma.note.update({
      data: {title: note.title, content: cleanContent(note.content), updatedAt: updatedAt},
      where: {id: note.id},
    });
  }));
  return NextResponse.json(res);
}
