import {cookies} from 'next/headers'
import {NextRequest, NextResponse} from "next/server";

export async function PUT(
  req: NextRequest,
) {
  const {key, expiration} = await req.json();

  const cookieStore = cookies();
  cookieStore.set("FOLDER_KEY", key, {
    maxAge: expiration,
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
  });

  return NextResponse.json("ok");
}
