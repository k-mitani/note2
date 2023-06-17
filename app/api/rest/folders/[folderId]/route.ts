import {PrismaClient} from "@prisma/client";
import {NextRequest, NextResponse} from "next/server";

const prisma = new PrismaClient();

export async function GET(
  _req: NextRequest,
  {params}: { params: { folderId: string } }
) {
  const folderId = parseInt(params.folderId);
  const folder = await prisma.folder.findUnique({
    include: {
      notes: true,
    },
    where: {id: folderId},
  })
  return NextResponse.json(folder);
}


// export async function GET() {
//   const folders = await prisma.folder.findMany({
//     where: {parentFolderId: null},
//     include: {
//       childFolders: {
//         include: {
//           notes: {
//             select: {
//               id: true,
//               title: true,
//               tags: true,
//               attributes: true,
//               createdAt: true,
//               updatedAt: true,
//               folderId: true,
//             },
//           }
//         }
//       },
//     }
//   });
//   return NextResponse.json(folders);
// }
