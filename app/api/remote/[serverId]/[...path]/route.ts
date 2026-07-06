import {NextRequest, NextResponse} from "next/server";
import {cookies} from "next/headers";
import settings from "@/lib/settings";

/**
 * 登録済みリモートnote2サーバーへのプロキシ。
 * `/api/remote/<serverId>/api/...` を `<server.url>/api/...` へ中継する。
 *
 * - BASIC認証: クライアントが `x-remote-authorization` ヘッダーで渡した値を
 *   リモートへの `Authorization` ヘッダーとして転送する（nginx BASIC認証向け）。
 * - フォルダーロック: リモートの FOLDER_KEY cookie はローカルでは
 *   `REMOTE_FOLDER_KEY_<serverId>` として保持し、双方向に変換する。
 *   これによりリモートの setFolderKey / ロック判定がそのまま機能する。
 */

const REMOTE_COOKIE_PREFIX = "REMOTE_FOLDER_KEY_";

type Params = { serverId: string, path: string[] };

async function proxy(req: NextRequest, {params}: { params: Promise<Params> }) {
  const {serverId, path} = await params;
  const servers = await settings.getRemoteServers();
  const server = servers.find(s => s.id === serverId);
  if (server == null) {
    return NextResponse.json({error: "unknown remote server"}, {status: 404});
  }

  const targetPath = path.join("/");
  // note2のAPIと画像配信のみ中継する。
  if (!targetPath.startsWith("api/") && !targetPath.startsWith("objects/")) {
    return NextResponse.json({error: "path not allowed"}, {status: 400});
  }
  const base = server.url.endsWith("/") ? server.url : server.url + "/";
  const targetUrl = new URL(targetPath + req.nextUrl.search, base);

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType != null) headers.set("content-type", contentType);
  const auth = req.headers.get("x-remote-authorization");
  if (auth != null) headers.set("authorization", auth);
  const cookieStore = await cookies();
  const remoteFolderKey = cookieStore.get(REMOTE_COOKIE_PREFIX + serverId)?.value;
  if (remoteFolderKey != null) {
    headers.set("cookie", `FOLDER_KEY=${remoteFolderKey}`);
  }

  let res: Response;
  try {
    res = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
      redirect: "manual",
      cache: "no-store",
    });
  } catch (e: any) {
    console.error("remote proxy error", server.name, targetUrl.href, e);
    return NextResponse.json({error: "remote unreachable: " + e?.message}, {status: 502});
  }

  const resHeaders = new Headers();
  const resContentType = res.headers.get("content-type");
  if (resContentType != null) resHeaders.set("content-type", resContentType);
  const response = new NextResponse(res.body, {status: res.status, headers: resHeaders});

  // リモートが設定した FOLDER_KEY cookie をローカル用の名前に付け替えて保持する。
  for (const setCookie of res.headers.getSetCookie?.() ?? []) {
    const match = setCookie.match(/^FOLDER_KEY=([^;]*)/);
    if (match == null) continue;
    const maxAgeMatch = setCookie.match(/Max-Age=(\d+)/i);
    response.cookies.set(REMOTE_COOKIE_PREFIX + serverId, decodeURIComponent(match[1]), {
      maxAge: maxAgeMatch != null ? parseInt(maxAgeMatch[1]) : undefined,
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });
  }
  return response;
}

export {proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE};
