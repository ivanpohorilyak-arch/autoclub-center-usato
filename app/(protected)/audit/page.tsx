"use client"

import { useEffect, useMemo, useState } from "react"
import { Topbar } from "../../../components/layout/topbar"

type AuditRecord = {
  id: number
  created_at: string
  operatore: string | null
  azione: string
  targa: string | null
  numero_chiave: number | null
  zona_id: string | null
  zona_attuale: string | null
  dettaglio: string | null
  esito: string
}

function getAzioneBadgeClass(azione: string) {
  const key = azione.toUpperCase()

  if (key.includes("INGRESSO")) {
    return "bg-blue-100 text-blue-700"
  }

  if (key.includes("SPOSTAMENTO")) {
    return "bg-amber-100 text-amber-700"
  }

  if (key.includes("CONSEGNA")) {
    return "bg-emerald-100 text-emerald-700"
  }

  if (key.includes("LOGIN")) {
    return "bg-violet-100 text-violet-700"
  }

  if (key.includes("LOGOUT")) {
    return "bg-slate-200 text-slate-700"
  }

  if (key.includes("MODIFICA")) {
    return "bg-orange-100 text-orange-700"
  }

  if (key.includes("NEGATA") || key.includes("KO")) {
    return "bg-red-100 text-red-700"
  }

  return "bg-slate-100 text-slate-700"
}

function getEsitoBadgeClass(esito: string) {
  return esito === "OK"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-red-100 text-red-700"
}

export default function AuditPage() {
  const [records, setRecords] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [showScrollTop, setShowScrollTop] = useState(false)

  async function loadAudit() {
    setLoading(true)

    try {
      const res = await fetch(`/api/audit?q=${encodeURIComponent(query)}`, {
        cache: "no-store",
      })

      const data = await res.json()

      if (data.ok) {
        setRecords(data.records || [])
      } else {
        setRecords([])
      }
    } catch {
      setRecords([])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadAudit()
  }, [])

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

  const totalRecords = useMemo(() => records.length, [records])

  function exportCSV() {
    const header =
      "Data,Operatore,Azione,Targa,Chiave,Zona ID,Zona Attuale,Dettaglio,Esito\n"

    const rows = records
      .map((r) => {
        const date = new Date(r.created_at).toLocaleString()

        return [
          date,
          r.operatore || "",
          r.azione || "",
          r.targa || "",
          r.numero_chiave ?? "",
          r.zona_id || "",
          r.zona_attuale || "",
          (r.dettaglio || "").replaceAll(",", " ").replaceAll("\n", " "),
          r.esito || "",
        ].join(",")
      })
      .join("\n")

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "audit_log_sistema.csv"
    a.click()

    URL.revokeObjectURL(url)
  }

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
        <h1 className="text-3xl font-bold text-slate-900">Audit Log Sistema</h1>
        <p className="mt-1 text-sm text-slate-500">
          Monitoraggio completo delle attività operative e di sicurezza.
        </p>
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca targa, operatore, azione o dettaglio..."
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
        />

        <button
          onClick={loadAudit}
          className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Cerca
        </button>

        <button
          onClick={exportCSV}
          className="rounded-2xl bg-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Export CSV
        </button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Record caricati</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {loading ? "..." : totalRecords}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Ultimo aggiornamento</div>
          <div className="mt-1 text-base font-semibold text-slate-900">
            {new Date().toLocaleTimeString()}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Modalità</div>
          <div className="mt-1 text-base font-semibold text-slate-900">
            Audit live
          </div>
        </div>
      </div>

      <div className="hidden overflow-x-auto rounded-3xl border border-slate-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left text-slate-700">
            <tr>
              <th className="px-3 py-3">Data</th>
              <th className="px-3 py-3">Operatore</th>
              <th className="px-3 py-3">Azione</th>
              <th className="px-3 py-3">Targa</th>
              <th className="px-3 py-3">Chiave</th>
              <th className="px-3 py-3">Zona</th>
              <th className="px-3 py-3">Dettaglio</th>
              <th className="px-3 py-3">Esito</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  Caricamento...
                </td>
              </tr>
            )}

            {!loading && records.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  Nessun record trovato.
                </td>
              </tr>
            )}

            {records.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-3 whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString()}
                </td>

                <td className="px-3 py-3">{r.operatore || "-"}</td>

                <td className="px-3 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getAzioneBadgeClass(
                      r.azione
                    )}`}
                  >
                    {r.azione}
                  </span>
                </td>

                <td className="px-3 py-3 font-semibold text-slate-900">
                  {r.targa || "-"}
                </td>

                <td className="px-3 py-3">{r.numero_chiave ?? "-"}</td>

                <td className="px-3 py-3">{r.zona_attuale || r.zona_id || "-"}</td>

                <td className="px-3 py-3 text-slate-700">
                  {r.dettaglio || "-"}
                </td>

                <td className="px-3 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getEsitoBadgeClass(
                      r.esito
                    )}`}
                  >
                    {r.esito}
                  </span>
                </td>
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
            Nessun record trovato.
          </div>
        )}

        {records.map((r) => (
          <div
            key={r.id}
            className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="text-sm text-slate-500">
                {new Date(r.created_at).toLocaleString()}
              </div>

              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getEsitoBadgeClass(
                  r.esito
                )}`}
              >
                {r.esito}
              </span>
            </div>

            <div className="mb-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getAzioneBadgeClass(
                  r.azione
                )}`}
              >
                {r.azione}
              </span>
            </div>

            <div className="grid gap-2 text-sm">
              <div>
                <span className="text-slate-500">Operatore:</span>{" "}
                <span className="font-medium text-slate-900">
                  {r.operatore || "-"}
                </span>
              </div>

              <div>
                <span className="text-slate-500">Targa:</span>{" "}
                <span className="font-semibold text-slate-900">
                  {r.targa || "-"}
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
                <span className="text-slate-500">Dettaglio:</span>{" "}
                <span className="text-slate-900">{r.dettaglio || "-"}</span>
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
