"use client"

import { useState } from "react"
import { Topbar } from "../../../components/layout/topbar"

type Vettura = {
  targa: string
  marca_modello: string | null
  colore: string | null
  km: number | null
  numero_chiave: number | null
  zona_id: string | null
  zona_attuale: string | null
  data_ingresso: string | null
  note: string | null
  stato: string | null
}

export default function RicercaPage() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [vettura, setVettura] = useState<Vettura | null>(null)

  async function cerca() {
    if (!query.trim()) return

    setLoading(true)
    setError("")
    setVettura(null)

    try {
      const res = await fetch(`/api/ricerca?q=${encodeURIComponent(query)}`)

      const json = await res.json()

      if (!res.ok || !json.ok) {
        setError(json.error || "Vettura non trovata.")
        return
      }

      setVettura(json.data)
    } catch {
      setError("Errore di connessione.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">

      <Topbar />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Ricerca</h1>
        <p className="text-sm text-slate-500">
          Ricerca vettura per targa o numero chiave
        </p>
      </div>

      {/* CARD RICERCA */}

      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="flex flex-col gap-3 md:flex-row">

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Inserisci targa o numero chiave..."
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-violet-500"
          />

          <button
            onClick={cerca}
            disabled={loading}
            className="rounded-2xl bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {loading ? "Ricerca..." : "Cerca"}
          </button>

        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

      </div>

      {/* RISULTATO */}

      {vettura && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

            <div>
              <div className="text-2xl font-bold text-slate-900">
                {vettura.targa}
              </div>

              <div className="text-sm text-slate-500">
                {vettura.marca_modello || "Marca/Modello non disponibile"}
              </div>
            </div>

            <div className="text-sm text-slate-500">
              Stato:{" "}
              <span className="font-semibold text-slate-900">
                {vettura.stato || "—"}
              </span>
            </div>

          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Zona</div>
              <div className="text-lg font-semibold text-slate-900">
                {vettura.zona_attuale || vettura.zona_id || "-"}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Numero chiave</div>
              <div className="text-lg font-semibold text-slate-900">
                {vettura.numero_chiave ?? "-"}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Colore</div>
              <div className="text-lg font-semibold text-slate-900">
                {vettura.colore || "-"}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">KM</div>
              <div className="text-lg font-semibold text-slate-900">
                {vettura.km ?? "-"}
              </div>
            </div>

          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">

            <button className="rounded-2xl bg-amber-500 px-4 py-3 font-semibold text-white hover:bg-amber-600">
              Sposta vettura
            </button>

            <button className="rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700">
              Modifica dati
            </button>

            <button className="rounded-2xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700">
              Consegna vettura
            </button>

          </div>

        </div>
      )}
    </div>
  )
}
