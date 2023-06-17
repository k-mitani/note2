import {PrismaClient} from "@prisma/client";
import {NextResponse} from "next/server";

const prisma = new PrismaClient();
export async function GET() {
  const folders = await prisma.folder.findMany({
    where: {parentFolderId: null},
    include: {
      childFolders: {
      },
    }
  });
  return NextResponse.json(folders);
}
