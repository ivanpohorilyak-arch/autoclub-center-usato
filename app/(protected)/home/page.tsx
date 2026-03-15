"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Topbar } from "../../../components/layout/topbar"

type MeUser = {
  id: number
  nome: string
  ruolo: string
  attivo: boolean
  can_consegna: boolean
  can_modifica_targa: boolean
}

export default function HomePage() {
  const [user, setUser] = useState<MeUser | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch("/api/me", {
          cache: "no-store",
        })

        const data = await res.json()

        if (data?.ok && data?.user) {
          setUser(data.user)
        }
      } catch {
        setUser(null)
      } finally {
        setLoadingUser(false)
      }
    }

    loadMe()
  }, [])

  const isAdmin = (user?.ruolo || "").toLowerCase() === "admin"

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <Topbar />

      <div className="mb-6">
        <h2 className="text-3xl font-bold text-slate-900">Home</h2>
        <p className="mt-1 text-sm text-slate-500">
          Seleziona un’operazione del gestionale.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link
          href="/ingresso"
          className="rounded-3xl bg-blue-600 px-6 py-10 text-center text-2xl font-bold text-white shadow-sm transition hover:scale-[1.01] hover:bg-blue-700"
        >
          Ingresso Veicolo
        </Link>

        <Link
          href="/ricerca"
          className="rounded-3xl bg-green-600 px-6 py-10 text-center text-2xl font-bold text-white shadow-sm transition hover:scale-[1.01] hover:bg-green-700"
        >
          Ricerca Veicolo
        </Link>

        <Link
          href="/dashboard"
          className="rounded-3xl bg-violet-600 px-6 py-10 text-center text-2xl font-bold text-white shadow-sm transition hover:scale-[1.01] hover:bg-violet-700"
        >
          Dashboard
        </Link>

        <Link
          href="/verifica-zone"
          className="rounded-3xl bg-indigo-500 px-6 py-10 text-center text-2xl font-bold text-white shadow-sm transition hover:scale-[1.01] hover:bg-indigo-600"
        >
          Verifica Zone
        </Link>

        <Link
          href="/audit"
          className="rounded-3xl bg-slate-800 px-6 py-10 text-center text-2xl font-bold text-white shadow-sm transition hover:scale-[1.01] hover:bg-slate-900"
        >
          Audit Log Sistema
        </Link>

        <Link
          href="/export"
          className="rounded-3xl bg-cyan-600 px-6 py-10 text-center text-2xl font-bold text-white shadow-sm transition hover:scale-[1.01] hover:bg-cyan-700"
        >
          Export
        </Link>

        <Link
          href="/stampa-qr-zone"
          className="rounded-3xl bg-amber-500 px-6 py-10 text-center text-2xl font-bold text-white shadow-sm transition hover:scale-[1.01] hover:bg-amber-600"
        >
          Stampa QR Zone
        </Link>

        <Link
          href="/ripristina"
          className="rounded-3xl bg-rose-500 px-6 py-10 text-center text-2xl font-bold text-white shadow-sm transition hover:scale-[1.01] hover:bg-rose-600"
        >
          Ripristina
        </Link>

        {!loadingUser && isAdmin && (
          <Link
            href="/gestione-utenti"
            className="rounded-3xl bg-indigo-700 px-6 py-10 text-center text-2xl font-bold text-white shadow-sm transition hover:scale-[1.01] hover:bg-indigo-800"
          >
            Gestione Utenti
          </Link>
        )}
      </div>
    </div>
  )
}
