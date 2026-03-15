"use client"

import { useState } from "react"
import { Topbar } from "../../../components/layout/topbar"

type RipristinoRecord = {
  targa: string
  marca_modello: string | null
  colore: string | null
  km: number | null
  numero_chiave: number | null
  zona_attuale: string | null
  zona_id: string | null
  data_ingresso: string | null
  note: string | null
  stato: string
}

export default function RipristinaPage() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [records, setRecords] = useState<RipristinoRecord[]>([])
  const [selected, setSelected] = useState<RipristinoRecord | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function cerca() {
    const q = query.trim()

    setMessage("")
    setError("")
    setSelected(null)

    if (!q) {
      setRecords([])
      setError("Inserisci targa o marca/modello.")
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`/api/ripristina?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Errore durante la ricerca.")
        setRecords([])
        return
      }

      setRecords(data.records || [])

      if ((data.records || []).length === 0) {
        setError("Nessuna vettura consegnata trovata.")
      }
    } catch {
      setError("Errore di connessione durante la ricerca.")
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  async function ripristina() {
    if (!selected) {
      setError("Seleziona una vettura.")
      return
    }

    setSubmitting(true)
    setMessage("")
    setError("")

    try {
      const res = await fetch("/api/ripristina", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targa: selected.targa,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Errore durante il ripristino.")
        return
      }

      setMessage(
        `Vettura ${selected.targa} ripristinata correttamente in parco.`
      )
      setRecords((prev) => prev.filter((r) => r.targa !== selected.targa))
      setSelected(null)
    } catch {
      setError("Errore di connessione durante il ripristino.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <Topbar />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Ripristina</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ripristina in parco una vettura consegnata cercando per targa o
          marca/modello.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            placeholder="Cerca targa o marca/modello..."
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-rose-500"
          />

          <button
            type="button"
            onClick={cerca}
            disabled={loading}
            className="rounded-2xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
          >
            {loading ? "Ricerca..." : "Cerca"}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        <div className="mt-5 space-y-3">
          {records.map((r) => {
            const active = selected?.targa === r.targa

            return (
              <button
                key={r.targa}
                type="button"
                onClick={() => {
                  setSelected(r)
                  setError("")
                  setMessage("")
                }}
                className={`w-full rounded-3xl border p-4 text-left transition ${
                  active
                    ? "border-rose-400 bg-rose-50"
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-xl font-bold text-slate-900">
                      {r.targa}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {r.marca_modello || "-"}
                    </div>
                  </div>

                  <div className="text-sm text-slate-600">
                    <div>
                      <span className="font-medium">Zona:</span>{" "}
                      {r.zona_attuale || r.zona_id || "-"}
                    </div>
                    <div>
                      <span className="font-medium">Chiave:</span>{" "}
                      {r.numero_chiave ?? "-"}
                    </div>
                    <div>
                      <span className="font-medium">Stato:</span> {r.stato}
                    </div>
                  </div>
                </div>

                {r.note && (
                  <div className="mt-3 rounded-2xl bg-white px-3 py-2 text-sm text-slate-600">
                    <span className="font-medium">Note:</span> {r.note}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {selected && (
          <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-5">
            <h2 className="text-xl font-bold text-slate-900">
              Conferma ripristino
            </h2>

            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              <div>
                <span className="font-semibold">Targa:</span> {selected.targa}
              </div>
              <div>
                <span className="font-semibold">Marca/Modello:</span>{" "}
                {selected.marca_modello || "-"}
              </div>
              <div>
                <span className="font-semibold">Zona mantenuta:</span>{" "}
                {selected.zona_attuale || selected.zona_id || "-"}
              </div>
              <div>
                <span className="font-semibold">Numero chiave attuale:</span>{" "}
                {selected.numero_chiave ?? "-"}
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
              Il ripristino riporta la vettura da <b>CONSEGNATO</b> a{" "}
              <b>PRESENTE</b> senza cambiare la zona. La chiave non viene
              riassegnata automaticamente.
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={ripristina}
                disabled={submitting}
                className="rounded-2xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
              >
                {submitting
                  ? "Ripristino in corso..."
                  : `Ripristina ${selected.targa}`}
              </button>

              <button
                type="button"
                onClick={() => setSelected(null)}
                disabled={submitting}
                className="rounded-2xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-300 disabled:opacity-60"
              >
                Annulla
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
