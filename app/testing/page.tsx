// import {Prisma, PrismaClient} from '@prisma/client'
// import notem from "@/lib/note-manager"
// import FolderCreateInput = Prisma.FolderCreateInput;
// import * as utils from "@/app/utils";
//
// const prisma = new PrismaClient()
//
// export default async function Page(props: any) {
//
//   // JSON形式の全情報を取得する。
//   const stacks = notem.getStacks().map((stackName) => {
//     return {
//       name: stackName,
//       notebooks: notem.getNotebooks(stackName).map((notebookName) => {
//         return {
//           name: notebookName,
//           notes: notem.getNotes(stackName, notebookName)
//         };
//       }),
//     };
//   });
//
//   // スタックをDBに保存する。
//   const foldersOfStack = [];
//   for (const stack of stacks) {
//     console.log(`saving... ${stack.name}`)
//     foldersOfStack.push(await prisma.folder.create({
//       data: {
//         name: stack.name,
//       },
//     }));
//   }
//
//   // ノートブックをDBに保存する。
//   const foldersOfNoteBook = [];
//   for (let i = 0; i < stacks.length; i++) {
//     const stack = stacks[i];
//     const folderOfStack = foldersOfStack[i];
//     for (const notebook of stack.notebooks) {
//       console.log(`saving... ${notebook.name}`)
//       foldersOfNoteBook.push(await prisma.folder.create({
//         data: {
//           name: notebook.name,
//           parentFolder: {
//             connect: {
//               id: folderOfStack.id,
//             },
//           },
//         },
//       }));
//     }
//   }
//
//   // ノートをDBに保存する。
//   var iNotebook = 0;
//   for (const stack of stacks) {
//     for (const notebook of stack.notebooks) {
//       const folderOfNotebook = foldersOfNoteBook[iNotebook++];
//       var chunkSize = 100;
//       const notesParts = splitArray(notebook.notes, chunkSize);
//       var i = 0;
//       for (const notesPart of notesParts) {
//         console.log(`saving... (${iNotebook}-${i += chunkSize}) ${notebook.name}`)
//         await prisma.note.createMany({
//           data: notesPart.map(note => ({
//             title: note.Title,
//             content: note.Content,
//             tags: note.Tags,
//             resource: note.Resource || undefined,
//             attributes: note.Attributes || [],
//             createdAt: utils.parseDate(note.CreatedAt),
//             updatedAt: note.UpdatedAt ? utils.parseDate(note.UpdatedAt) : null,
//             folderId: folderOfNotebook.id,
//           })),
//         });
//       }
//     }
//   }
//
//   function splitArray(array: any[], chunkSize: number) {
//     var result = [];
//     for (var i = 0; i < array.length; i += chunkSize) {
//       result.push(array.slice(i, i + chunkSize));
//     }
//     return result;
//   }
//
//   // const folders: FolderCreateInput[] = stacks.map(stack => {
//   //   return {
//   //     name: stack.name,
//   //     childFolders: {
//   //       createMany: {
//   //         data: stack.notebooks.map(notebook => {
//   //           return {
//   //             name: notebook.name,
//   //             notes: {
//   //               createMany: {
//   //                 data: notebook.notes.map(note => {
//   //                   return {
//   //                     title: note.Title,
//   //                     content: note.Content,
//   //                     tags: note.Tags,
//   //                     resource: note.Resource,
//   //                     attributes: note.Attributes,
//   //                     createdAt: utils.parseDate(note.CreatedAt),
//   //                     updatedAt: note.UpdatedAt ? utils.parseDate(note.UpdatedAt) : null,
//   //                   };
//   //                 }),
//   //               },
//   //             },
//   //           };
//   //         }),
//   //       }
//   //     }
//   //   }
//   // });
//
//   // for (const folder of folders) {
//   //   await prisma.folder.create({
//   //     data: folder,
//   //     include: {childFolders: true, notes: true},
//   //   });
//   //   console.log(folder);
//   // }
//
//
//   const root = (await prisma.folder.findFirst({
//     where: {name: "root"},
//     include: {childFolders: true},
//   }))!!;
//
//   const folders2 = await prisma.folder.findMany({
//     include: {childFolders: true},
//   });
//   try {
//     return (
//       <div>
//         <h1>Folders</h1>
//         <ul>
//           {folders2.map((folder) => (
//             <li key={folder.id}>
//               <span>{JSON.stringify(folder)}</span>
//             </li>
//           ))}
//         </ul>
//       </div>
//     )
//   } finally {
//     await prisma.$disconnect()
//   }
// }