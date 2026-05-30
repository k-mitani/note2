import * as child_process from "child_process";

const ARCHIVE_COMMAND = process.env.ARCHIVE_COMMAND;

export function archiveUrl(url: string) {
  if (ARCHIVE_COMMAND == null) return;
  // URLのschemeを検証（http/httpsのみ許可）してコマンドインジェクションを防ぐ
  if (!/^https?:\/\//i.test(url)) {
    console.warn("archive skipped: invalid URL scheme", url);
    return;
  }
  // ARCHIVE_COMMANDをスペース区切りで分割し、URLを別引数として渡す。
  // exec()（シェル経由）の代わりにexecFile()を使うことで、
  // URLに含まれる ;, &, | 等のシェル特殊文字によるコマンドインジェクションを防ぐ。
  const [cmd, ...cmdArgs] = ARCHIVE_COMMAND.split(/\s+/).filter(Boolean);
  const args = [...cmdArgs, url];
  console.log("archive", cmd, args);
  child_process.execFile(cmd, args, (error, stdout, stderr) => {
    if (error != null) console.error("archive error", error);
    if (stdout != null) console.log("archive stdout", stdout);
    if (stderr != null) console.error("archive stderr", stderr);
  });
}
