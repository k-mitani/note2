import {cleanContent} from "@/lib/cleanContent";
import {uploadDataUrlImages} from "@/lib/dataUrlImages";

export async function normalizeNoteContent(content: string): Promise<string> {
  return cleanContent(await uploadDataUrlImages(content));
}
