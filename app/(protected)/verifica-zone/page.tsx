"use client"

import { useEffect, useState } from "react"
import { Topbar } from "../../../components/layout/topbar"

type VeicoloZona = {
  targa: string
  marca_modello: string | null
  colore: string | null
  km: number | null
  numero_chiave: number | null
  zona_attuale: string | null
  zona_id: string | null
  note: string | null
}

const ZONE_INFO: Record<string, string> = {
  Z01: "Deposito N.9",
  Z02: "Deposito N.7",
  Z03: "Deposito N.6 (Lavaggisti)",
  Z04: "Deposito unificato 1 e 2",
  Z05: "Showroom",
  Z06: "Vetture vendute",
  Z07: "Piazzale Lavaggio",
  Z08: "Commercianti senza telo",
  Z09: "Commercianti con telo",
  Z10: "Lavorazioni esterni",
  Z11: "Verso altre sedi",
  Z12: "Deposito N.10",
  Z13: "Deposito N.8",
  Z14: "Esterno (Con o Senza telo Motorsclub)",
}

export default function VerificaZonePage() {
  const [zonaId, setZonaId] = useState("Z01")
  const [records, setRecords] = useState<VeicoloZona[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showScrollTop, setShowScrollTop] = useState(false)

  async function loadZona(selectedZonaId: string) {
    setLoading(true)
    setError("")

    try {
      const res = await fetch(
        `/api/verifica-zone?zona_id=${encodeURIComponent(selectedZonaId)}`,
        { cache: "no-store" }
      )

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Errore caricamento zona.")
        setRecords([])
        return
      }

      setRecords(data.records || [])
    } catch {
      setError("Errore di connessione.")
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadZona(zonaId)
  }, [zonaId])

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  function scrollTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <Topbar />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Verifica Zone</h1>
        <p className="mt-1 text-sm text-slate-500">
          Analisi vetture presenti per singola zona operativa.
        </p>
      </div>

      <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <select
            value={zonaId}
            onChange={(e) => setZonaId(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-blue-500"
          >
            {Object.entries(ZONE_INFO).map(([id, nome]) => (
              <option key={id} value={id}>
                {id} - {nome}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => loadZona(zonaId)}
            disabled={loading}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Caricamento..." : "Aggiorna"}
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Zona selezionata</div>
          <div className="mt-1 text-lg font-bold text-slate-900">
            {zonaId} - {ZONE_INFO[zonaId]}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Totale vetture</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {loading ? "..." : records.length}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Stato vista</div>
          <div className="mt-1 text-base font-semibold text-slate-900">
            {loading ? "Aggiornamento..." : "Live"}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="hidden overflow-x-auto rounded-3xl border border-slate-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left text-slate-700">
            <tr>
              <th className="px-3 py-3">Targa</th>
              <th className="px-3 py-3">Marca / Modello</th>
              <th className="px-3 py-3">Colore</th>
              <th className="px-3 py-3">KM</th>
              <th className="px-3 py-3">Chiave</th>
              <th className="px-3 py-3">Zona</th>
              <th className="px-3 py-3">Note</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  Caricamento...
                </td>
              </tr>
            )}

            {!loading && records.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  Nessuna vettura presente in questa zona.
                </td>
              </tr>
            )}

            {records.map((r) => (
              <tr key={r.targa} className="border-t border-slate-100">
                <td className="px-3 py-3 font-semibold text-slate-900">
                  {r.targa}
                </td>
                <td className="px-3 py-3">{r.marca_modello || "-"}</td>
                <td className="px-3 py-3">{r.colore || "-"}</td>
                <td className="px-3 py-3">{r.km ?? "-"}</td>
                <td className="px-3 py-3">{r.numero_chiave ?? "-"}</td>
                <td className="px-3 py-3">{r.zona_attuale || r.zona_id || "-"}</td>
                <td className="px-3 py-3">{r.note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {loading && (
          <div className="rounded-3xl border border-slate-200 bg-white p-4 text-center text-slate-500">
            Caricamento...
          </div>
        )}

        {!loading && records.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-4 text-center text-slate-500">
            Nessuna vettura presente in questa zona.
          </div>
        )}

        {records.map((r) => (
          <div
            key={r.targa}
            className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="text-xl font-bold text-slate-900">{r.targa}</div>
            <div className="mt-1 text-sm text-slate-600">
              {r.marca_modello || "-"}
            </div>

            <div className="mt-3 grid gap-2 text-sm">
              <div>
                <span className="text-slate-500">Colore:</span>{" "}
                <span className="font-medium text-slate-900">
                  {r.colore || "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">KM:</span>{" "}
                <span className="font-medium text-slate-900">
                  {r.km ?? "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Chiave:</span>{" "}
                <span className="font-medium text-slate-900">
                  {r.numero_chiave ?? "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Zona:</span>{" "}
                <span className="font-medium text-slate-900">
                  {r.zona_attuale || r.zona_id || "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Note:</span>{" "}
                <span className="text-slate-900">{r.note || "-"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showScrollTop && (
        <button
          onClick={scrollTop}
          aria-label="Torna su"
          className="fixed right-5 bottom-24 md:bottom-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-xl transition-all duration-200 hover:bg-violet-700 active:scale-95 md:h-12 md:w-auto md:min-w-[124px] md:rounded-2xl md:px-4"
        >
          <span className="text-xl md:hidden">↑</span>
          <span className="hidden text-sm font-semibold md:inline">Torna su</span>
        </button>
      )}
    </div>
  )
}
