"use client"

import { Topbar } from "../../../components/layout/topbar"
import { useEffect, useState } from "react"

type Zona = {
  id: string
  nome: string
}

export default function ExportPage() {
  const [zone, setZone] = useState<Zona[]>([])
  const [zoneLoading, setZoneLoading] = useState(true)

  const [zonaId, setZonaId] = useState("TUTTE")
  const [periodoLog, setPeriodoLog] = useState("ultimi_7_giorni")
  const [periodoAudit, setPeriodoAudit] = useState("ultimi_7_giorni")
  const [loading, setLoading] = useState("")

  useEffect(() => {
    let active = true

    async function loadZone() {
      try {
        setZoneLoading(true)

        const res = await fetch("/api/zone", {
          method: "GET",
          cache: "no-store",
        })

        const data = await res.json()

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "Errore caricamento zone")
        }

        if (!active) return

        setZone(Array.isArray(data.zone) ? data.zone : [])
      } catch (err) {
        console.error("LOAD ZONE ERROR:", err)
        if (active) {
          setZone([])
        }
      } finally {
        if (active) {
          setZoneLoading(false)
        }
      }
    }

    void loadZone()

    return () => {
      active = false
    }
  }, [])

  function scarica(url: string) {
    const a = document.createElement("a")
    a.href = url
    a.click()
  }

  function exportParcoUsato() {
    setLoading("parco")
    scarica(`/api/export?tipo=parco_usato&zona_id=${encodeURIComponent(zonaId)}`)
    setTimeout(() => setLoading(""), 800)
  }

  function exportLogMovimenti() {
    setLoading("log")
    scarica(
      `/api/export?tipo=log_movimenti&periodo=${encodeURIComponent(periodoLog)}`
    )
    setTimeout(() => setLoading(""), 800)
  }

  function exportAuditLog() {
    setLoading("audit")
    scarica(
      `/api/export?tipo=audit_log&periodo=${encodeURIComponent(periodoAudit)}`
    )
    setTimeout(() => setLoading(""), 800)
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <Topbar />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Export</h1>
        <p className="mt-1 text-sm text-slate-500">
          Esporta dati operativi del sistema in formato CSV.
        </p>
      </div>

      <div className="grid items-stretch gap-4 xl:grid-cols-3">
        <div className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Parco Usato</h2>
          <p className="mt-1 min-h-[48px] text-sm text-slate-500">
            Esporta vetture presenti in parco, filtrabili per zona.
          </p>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Zona
            </label>
            <select
              value={zonaId}
              onChange={(e) => setZonaId(e.target.value)}
              disabled={zoneLoading}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-cyan-500 disabled:opacity-60"
            >
              <option value="TUTTE">Tutte le zone</option>
              {zone.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.id} - {z.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-auto pt-4">
            <button
              type="button"
              onClick={exportParcoUsato}
              disabled={zoneLoading}
              className="w-full rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
            >
              {loading === "parco" ? "Preparazione..." : "Export CSV Parco Usato"}
            </button>
          </div>
        </div>

        <div className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Log Movimenti</h2>
          <p className="mt-1 min-h-[48px] text-sm text-slate-500">
            Esporta ingressi, spostamenti, consegne e ripristini.
          </p>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Periodo
            </label>
            <select
              value={periodoLog}
              onChange={(e) => setPeriodoLog(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-cyan-500"
            >
              <option value="oggi">Oggi</option>
              <option value="ultimi_7_giorni">Ultimi 7 giorni</option>
              <option value="ultimi_30_giorni">Ultimi 30 giorni</option>
            </select>
          </div>

          <div className="mt-auto pt-4">
            <button
              type="button"
              onClick={exportLogMovimenti}
              className="w-full rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-700"
            >
              {loading === "log" ? "Preparazione..." : "Export CSV Log Movimenti"}
            </button>
          </div>
        </div>

        <div className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Audit Log Sistema</h2>
          <p className="mt-1 min-h-[48px] text-sm text-slate-500">
            Esporta log tecnico e operativo del sistema.
          </p>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Periodo
            </label>
            <select
              value={periodoAudit}
              onChange={(e) => setPeriodoAudit(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-cyan-500"
            >
              <option value="oggi">Oggi</option>
              <option value="ultimi_7_giorni">Ultimi 7 giorni</option>
              <option value="ultimi_30_giorni">Ultimi 30 giorni</option>
            </select>
          </div>

          <div className="mt-auto pt-4">
            <button
              type="button"
              onClick={exportAuditLog}
              className="w-full rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-700"
            >
              {loading === "audit" ? "Preparazione..." : "Export CSV Audit Log"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
