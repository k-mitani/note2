import {NextRequest, NextResponse} from "next/server";
import settings, {RemoteServer} from "@/lib/settings";
import {isFolderLockUnlocked} from "@/lib/folderLock";
import {parseHttpUrl} from "@/lib/linkPreview";

/**
 * リモートサーバー一覧はサーバー切替のため常に返すが、
 * 登録・変更（PUT）とそのUI表示はフォルダーロック解除状態でのみ許可する。
 */
export async function GET() {
  const [servers, unlocked] = await Promise.all([
    settings.getRemoteServers(),
    isFolderLockUnlocked(),
  ]);
  return NextResponse.json({servers, unlocked});
}

export async function PUT(req: NextRequest) {
  if (!await isFolderLockUnlocked()) {
    return NextResponse.json({error: "locked"}, {status: 403});
  }
  const {servers} = await req.json() as { servers: RemoteServer[] };
  if (!Array.isArray(servers)) {
    return NextResponse.json({error: "invalid servers"}, {status: 400});
  }
  for (const server of servers) {
    if (typeof server.id !== "string" || !/^[0-9a-zA-Z-]+$/.test(server.id) ||
      typeof server.name !== "string" || server.name.trim() === "" ||
      typeof server.url !== "string" || parseHttpUrl(server.url) == null) {
      return NextResponse.json({error: "invalid server entry"}, {status: 400});
    }
  }
  await settings.setRemoteServers(servers.map(s => ({
    id: s.id,
    name: s.name.trim(),
    url: parseHttpUrl(s.url)!.href,
  })));
  return NextResponse.json("ok");
}
