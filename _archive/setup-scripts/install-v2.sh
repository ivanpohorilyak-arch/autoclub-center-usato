#!/bin/bash

echo "Installazione base Autoclub V2..."

# layout
cat > app/layout.tsx << 'EOF'
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Autoclub V2",
  description: "Gestione piazzale",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  )
}
EOF


# redirect root
cat > app/page.tsx << 'EOF'
import { redirect } from "next/navigation"

export default function Page() {
  redirect("/login")
}
EOF


# css
cat > app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background: #f8fafc;
}
EOF


# login page
cat > app/'(auth)'/login/page.tsx << 'EOF'
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <h1 className="text-3xl font-bold mb-4">Autoclub V2</h1>
        <LoginForm />
      </div>
    </main>
  )
}
EOF


# login form
cat > components/auth/login-form.tsx << 'EOF'
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export function LoginForm() {

  const router = useRouter()

  const [utenti,setUtenti] = useState([])
  const [nome,setNome] = useState("")
  const [pin,setPin] = useState("")
  const [error,setError] = useState("")

  useEffect(()=>{

    async function load(){

      const res = await fetch("/api/utenti-attivi")
      const data = await res.json()

      setUtenti(data.utenti || [])

    }

    load()

  },[])

  async function submit(e){

    e.preventDefault()

    const res = await fetch("/api/auth/login",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({nome,pin})
    })

    const data = await res.json()

    if(!res.ok){
      setError(data.error)
      return
    }

    router.push("/home")

  }

  return (

    <form onSubmit={submit} className="space-y-4">

      <select
      className="w-full border p-3 rounded-xl"
      value={nome}
      onChange={e=>setNome(e.target.value)}
      >

        <option value="">Seleziona operatore</option>

        {utenti.map((u)=>(
          <option key={u.nome} value={u.nome}>{u.nome}</option>
        ))}

      </select>

      <input
      type="password"
      className="w-full border p-3 rounded-xl"
      placeholder="PIN"
      value={pin}
      onChange={e=>setPin(e.target.value)}
      />

      {error && <div className="text-red-500">{error}</div>}

      <button className="w-full bg-indigo-600 text-white p-3 rounded-xl">
        Accedi
      </button>

    </form>

  )

}
EOF


# app shell
cat > components/layout/app-shell.tsx << 'EOF'
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
EOF


# page title
cat > components/ui/page-title.tsx << 'EOF'
export function PageTitle({title}){

  return(

    <h1 className="text-2xl font-bold mb-4">

      {title}

    </h1>

  )

}
EOF


# home page
cat > app/'(protected)'/home/page.tsx << 'EOF'
import { AppShell } from "@/components/layout/app-shell"
import { PageTitle } from "@/components/ui/page-title"

export default function HomePage(){

  const user = {nome:"Operatore"}

  return(

    <AppShell user={user}>

      <PageTitle title="Home"/>

      <div className="grid grid-cols-2 gap-4">

        <a href="/ingresso" className="border p-4 rounded-xl">Ingresso</a>
        <a href="/ricerca" className="border p-4 rounded-xl">Ricerca</a>
        <a href="/dashboard" className="border p-4 rounded-xl">Dashboard</a>

      </div>

    </AppShell>

  )

}
EOF


# API utenti attivi
cat > app/api/utenti-attivi/route.ts << 'EOF'
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL,
process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(){

const {data} = await supabase.rpc("lista_utenti_attivi")

return NextResponse.json({utenti:data})

}
EOF


echo "Installazione completata!"
