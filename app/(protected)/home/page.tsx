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

// Stile uniforme per tutte le tile della home.
// Sfondo antracite (slate-600), accento ambra all'hover (palette B).
const tileClass =
  "rounded-3xl bg-slate-600 px-6 py-10 text-center text-2xl font-bold text-white shadow-sm transition hover:scale-[1.01] hover:bg-slate-700 hover:ring-2 hover:ring-amber-500"

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

        if (data?.ok) {
          setUser({
            id: data.id,
            nome: data.nome,
            ruolo: data.ruolo,
            attivo: data.attivo,
            can_consegna: data.can_consegna,
            can_modifica_targa: data.can_modifica_targa,
          })
        } else {
          setUser(null)
        }
      } catch {
        setUser(null)
      } finally {
        setLoadingUser(false)
      }
    }

    void loadMe()
  }, [])

  const isAdmin = (user?.ruolo || "").toLowerCase() === "admin"

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <Topbar />

      <div className="mb-6">
        <h2 className="text-3xl font-bold text-slate-900">Home</h2>
        <p className="mt-1 text-sm text-slate-500">
          Seleziona un&rsquo;operazione del gestionale.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link href="/ingresso" className={tileClass}>
          Ingresso Veicolo
        </Link>

        <Link href="/ricerca" className={tileClass}>
          Ricerca Veicolo
        </Link>

        <Link href="/dashboard" className={tileClass}>
          Dashboard
        </Link>

        <Link href="/verifica-zone" className={tileClass}>
          Verifica Zone
        </Link>

        <Link href="/audit" className={tileClass}>
          Audit Log Sistema
        </Link>

        <Link href="/export" className={tileClass}>
          Export
        </Link>

        <Link href="/stampa-qr-zone" className={tileClass}>
          Stampa QR Zone
        </Link>

        <Link href="/ripristina" className={tileClass}>
          Ripristina
        </Link>

        {!loadingUser && isAdmin && (
          <Link href="/gestione-utenti" className={tileClass}>
            Gestione Utenti
          </Link>
        )}

        {!loadingUser && isAdmin && (
          <Link href="/zone" className={tileClass}>
            Gestione Zone
          </Link>
        )}
      </div>
    </div>
  )
}
