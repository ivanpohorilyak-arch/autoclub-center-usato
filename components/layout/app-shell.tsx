import Link from "next/link"

export function AppShell({children,user}){

  return(

    <div>

      <header className="border-b bg-white p-4 flex justify-between">

        <div className="font-bold">Autoclub V2</div>

        <div>{user.nome}</div>

      </header>

      <div className="flex">

        <aside className="w-60 border-r p-4 space-y-2">

          <Link href="/home">Home</Link>
          <Link href="/ingresso">Ingresso</Link>
          <Link href="/ricerca">Ricerca</Link>
          <Link href="/dashboard">Dashboard</Link>

        </aside>

        <main className="p-6 w-full">

          {children}

        </main>

      </div>

    </div>

  )

}
