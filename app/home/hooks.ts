import useSWR from "swr";
import {Folder, Note} from "@prisma/client";

type FolderAndChild = Folder & { childFolders: FolderAndChild[] };

function fetcher(url: string) {
  return fetch(url).then(res => res.json())
}

export function useFoldersAll() {
  return useSWR<{
    folders: FolderAndChild[],
    trash: FolderAndChild
  }>('/api/rpc/getFoldersAll', fetcher);
}

export function useFolderAndNotes(folderId: number | undefined) {
  const swr = useSWR<Folder & { notes: Note[] }>(`/api/folders/${folderId}`, fetcher);
  if (swr.data != null) {
    swr.data.notes.forEach((n: Note) => {
      if (n != null && !(n.updatedAt instanceof Date)) n.updatedAt = new Date(n.updatedAt as any);
      if (!(n.createdAt instanceof Date)) n.createdAt = new Date(n.createdAt as any);
    });
  }
  return swr;
}
