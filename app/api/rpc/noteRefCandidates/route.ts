export const dynamic = "force-dynamic";
import {NextRequest, NextResponse} from "next/server";
import {
  getNoteRefCandidateLimit,
  getNoteRefCandidates,
  parsePositiveInt,
} from "@/lib/noteRefCandidates";

export async function GET(req: NextRequest) {
  const limit = getNoteRefCandidateLimit(req.nextUrl.searchParams.get("limit"));
  const excludeId = parsePositiveInt(req.nextUrl.searchParams.get("excludeId"));

  return NextResponse.json({
    notes: await getNoteRefCandidates({limit, excludeId}),
  });
}
