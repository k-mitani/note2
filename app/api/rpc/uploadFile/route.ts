import {NextRequest, NextResponse} from "next/server";
import * as s3 from '@/lib/s3client';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  req: NextRequest,
  // {params}: { params: any },
) {
  try {
  const form = await req.formData();
  const file = form.get("file") as File;
  const DIRECTORY = "files/v1/";
  const filename = file.name;
  const url = await s3.saveObject(DIRECTORY + uuidv4() + "/" + filename, file);
  console.log("uploadFile", url);
  return NextResponse.json(url);
  } catch (e) {
    console.error(e);
    return NextResponse.error();
  }
}
