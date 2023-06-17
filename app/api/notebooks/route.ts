import notem from '@/lib/note-manager'
import {NextResponse} from "next/server";

var _id = 0;
function uniqueId() {
  return _id++;
}

function getNotebooks() {
  return notem.getStacks().map(stack => {
    return {
      id: uniqueId(),
      name: stack,
      notebooks: notem.getNotebooks(stack).map(notebook => {
        return {
          id: uniqueId(),
          name: notebook,
          stackName: stack,
          notes: null,
        };
      })
    };
  });
}


export async function GET() {
  const stacks = getNotebooks();
  return NextResponse.json(stacks);
}
