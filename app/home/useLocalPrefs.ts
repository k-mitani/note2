import {create} from "zustand";
import {persist} from "zustand/middleware";

interface LocalPreferencesStore {
  theme: string;
  setTheme: (theme: string) => void
  autoSave: boolean;
  setAutoSave: (autoSave: boolean) => void;
  showSideBar: boolean;
  showNoteListView: boolean;
  setShowSideBar: (show: boolean) => void;
  setShowNoteListView: (show: boolean) => void;

  folderFoldingStateDict: { [key: number]: boolean };
  setFolderFoldingState: (id: number, fold: boolean) => void;

  // リモートサーバーセクションの展開状態（リロード時に自動再接続する）
  remoteExpandedDict: { [serverId: string]: boolean };
  setRemoteExpanded: (serverId: string, expanded: boolean) => void;
  // リモートサーバーのフォルダー開閉状態（キーは "<serverId>:<folderId>"）
  remoteFoldingDict: { [key: string]: boolean };
  setRemoteFolding: (key: string, fold: boolean) => void;
}

export const useLocalPrefs = create<LocalPreferencesStore>()(
  persist(
    (set, get) => ({
      // テーマ
      theme: "",
      setTheme: (theme: string) => set({theme}),

      // 自動保存
      autoSave: true,
      setAutoSave: (autoSave: boolean) => set({autoSave}),

      // サイドバーの表示/非表示を設定するアクション
      showSideBar: true,
      setShowSideBar: (show) => set({showSideBar: show}),

      // ノートリストビューの表示/非表示を設定するアクション
      showNoteListView: true,
      setShowNoteListView: (show) => set({showNoteListView: show}),

      // フォルダーの開閉状態を保存する辞書
      folderFoldingStateDict: {} as { [key: number]: boolean },
      setFolderFoldingState: (id: number, fold: boolean) => {
        const val = get().folderFoldingStateDict;
        set({folderFoldingStateDict: {...val, [id]: fold}});
      },

      // リモートサーバーセクションの展開状態
      remoteExpandedDict: {},
      setRemoteExpanded: (serverId: string, expanded: boolean) => {
        const val = get().remoteExpandedDict;
        set({remoteExpandedDict: {...val, [serverId]: expanded}});
      },

      // リモートサーバーのフォルダー開閉状態
      remoteFoldingDict: {},
      setRemoteFolding: (key: string, fold: boolean) => {
        const val = get().remoteFoldingDict;
        set({remoteFoldingDict: {...val, [key]: fold}});
      },
    }),
    {
      name: 'preferences',
    },
  ),
);