export type FolderNode<T = unknown> = T & {
  id: number;
  childFolders?: FolderNode<T>[];
};

/** 木構造から指定IDのフォルダーを再帰的に探す。 */
export function findFolderById<T>(targetId: number, folders: FolderNode<T>[]): FolderNode<T> | null {
  for (const f of folders) {
    if (f.id === targetId) return f;
    if (f.childFolders) {
      const found = findFolderById(targetId, f.childFolders);
      if (found) return found;
    }
  }
  return null;
}

/** 木構造をDFSで開いている順にトラバースし、指定要素の一つ前を返す。 */
export function findPrevFolder<T>(
  target: FolderNode<T>,
  folders: FolderNode<T>[],
  isFolded: (id: number) => boolean,
): FolderNode<T> | null {
  let current: FolderNode<T> | null = null;
  function walk(fs: FolderNode<T>[]): FolderNode<T> | null {
    for (const f of fs) {
      if (f === target) return current;
      current = f;
      if (f.childFolders && !isFolded(f.id)) {
        const found = walk(f.childFolders);
        if (found) return found;
      }
    }
    return null;
  }
  return walk(folders);
}

/** 木構造をDFSで開いている順にトラバースし、指定要素の一つ次を返す。 */
export function findNextFolder<T>(
  target: FolderNode<T>,
  folders: FolderNode<T>[],
  isFolded: (id: number) => boolean,
): FolderNode<T> | null {
  let current: FolderNode<T> | null = null;
  function walk(fs: FolderNode<T>[]): FolderNode<T> | null {
    for (let i = fs.length - 1; i >= 0; i--) {
      const f = fs[i];
      if (f.childFolders && !isFolded(f.id)) {
        const found = walk(f.childFolders);
        if (found) return found;
      }
      if (f === target) return current;
      current = f;
    }
    return null;
  }
  return walk(folders);
}
