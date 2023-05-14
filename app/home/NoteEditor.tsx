import React from "react";

export default function NoteEditor({note}: any) {
  if (note == null) note = {};
  return <div className={"grow bg-white h-screen overflow-y-scroll "}>
    <div className={"border-b-2 border-gray-200 p-2"}>
      <input className="text-blue-500 w-full" type="text" value={note.Title}></input>
      <div>
        <span className="text-xs text-gray-500">{note.UpdatedAt}</span>
        <span className="text-xs text-gray-500"> | </span>
        <span className="text-xs text-gray-500">{note.CreatedAt}</span>
      </div>
    </div>
    <div className={"p-2"}>
      <div dangerouslySetInnerHTML={{__html:note.Content}}>
      </div>
    </div>
  </div>
}
