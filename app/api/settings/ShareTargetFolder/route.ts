import {NextRequest, NextResponse} from "next/server";
import settings from "@/lib/settings";

type PostParams = {
  folderId: number,
}

export async function PUT(
  req: NextRequest,
) {
  const params: PostParams = await req.json();
  await settings.setShareTargetFolderId(params.folderId);
  return NextResponse.json("ok");
}

export async function GET(
) {
  const folderId = await settings.getShareTargetFolderId();
  return NextResponse.json({folderId});
}