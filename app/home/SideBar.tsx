/**
 * スタックやノートを表示する。
 */
export default function SideBar({stacks, selectedNotebook, setSelectedNotebook}: any) {
  return (
    <div className='flex-none w-72 bg-gray-700 text-white h-screen overflow-y-scroll'>
      <ul>
        <li>
          <button>新規ノートブック</button>
        </li>
        <li>
          <button>ショートカット</button>
        </li>
        <li>
          <button>全てのノート</button>
        </li>
      </ul>
      <ul className='mt-4'>
        {stacks.map((stack: any) => {
          return (
            <li key={stack.name} className='notebooks__stack'>
              <strong>📘{stack.name}</strong>
              <ul>
                {stack.notebooks.map((notebook: any) => {
                  return <li
                    key={stack.name + notebook.name}
                    onClick={() => setSelectedNotebook(notebook)}
                    className={
                      (selectedNotebook?.name === notebook.name ? "bg-gray-500" : "hover:bg-gray-600")
                    }>
                    {notebook.name}
                  </li>
                })}
              </ul>
            </li>
          );
        })}
      </ ul>
    </div>
  )
}