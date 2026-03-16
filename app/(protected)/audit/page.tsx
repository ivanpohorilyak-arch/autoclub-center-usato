"use client"

import { useEffect, useMemo, useState } from "react"
import { Topbar } from "../../../components/layout/topbar"

type AuditRecordRaw = {
  id?: number
  created_at?: string
  operatore?: string | null
  utente?: string | null
  azione?: string | null
  targa?: string | null
  numero_chiave?: number | null
  zona_id?: string | null
  zona_attuale?: string | null
  dettaglio?: string | null
  esito?: string | null
}

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

type AuditResponse = {
  ok: boolean
  records?: AuditRecordRaw[]
  total?: number
  limit?: number
  offset?: number
  hasMore?: boolean
  error?: string
}

function normalizeRecord(r: AuditRecordRaw, index: number): AuditRecord {
  return {
    id: r.id ?? index + 1,
    created_at: r.created_at || new Date().toISOString(),
    operatore: r.operatore ?? r.utente ?? null,
    azione: (r.azione || "NON RILEVATA").toString(),
    targa: r.targa ?? null,
    numero_chiave: r.numero_chiave ?? null,
    zona_id: r.zona_id ?? null,
    zona_attuale: r.zona_attuale ?? null,
    dettaglio: r.dettaglio ?? null,
    esito: (r.esito || "OK").toString(),
  }
}

function getAzioneBadgeClass(azione: string) {
  const key = (azione || "").toUpperCase()

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

  if (key.includes("RIPRISTINO")) {
    return "bg-rose-100 text-rose-700"
  }

  if (key.includes("NEGATA") || key.includes("KO") || key.includes("ERRORE")) {
    return "bg-red-100 text-red-700"
  }

  return "bg-slate-100 text-slate-700"
}

function getEsitoBadgeClass(esito: string) {
  const value = (esito || "").toUpperCase()
  return value === "OK"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-red-100 text-red-700"
}

const PAGE_SIZE = 250

export default function AuditPage() {
  const [records, setRecords] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState("")
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [totalAvailable, setTotalAvailable] = useState(0)

  const [q, setQ] = useState("")
  const [operatore, setOperatore] = useState("")
  const [azione, setAzione] = useState("")
  const [zona, setZona] = useState("")
  const [dettaglio, setDettaglio] = useState("")
  const [targa, setTarga] = useState("")
  const [chiave, setChiave] = useState("")
  const [dataDa, setDataDa] = useState("")
  const [dataA, setDataA] = useState("")
  const [hasMore, setHasMore] = useState(false)

  function buildParams(offset = 0) {
    const params = new URLSearchParams()

    if (q.trim()) params.set("q", q.trim())
    if (operatore.trim()) params.set("operatore", operatore.trim())
    if (azione.trim()) params.set("azione", azione.trim())
    if (zona.trim()) params.set("zona", zona.trim())
    if (dettaglio.trim()) params.set("dettaglio", dettaglio.trim())
    if (targa.trim()) params.set("targa", targa.trim().toUpperCase())
    if (chiave.trim()) params.set("chiave", chiave.trim())
    if (dataDa) params.set("data_da", dataDa)
    if (dataA) params.set("data_a", dataA)

    params.set("limit", String(PAGE_SIZE))
    params.set("offset", String(offset))

    return params.toString()
  }

  async function loadAudit(reset = true) {
    if (reset) {
      setLoading(true)
      setError("")
    } else {
      setLoadingMore(true)
    }

    try {
      const offset = reset ? 0 : records.length

      const res = await fetch(`/api/audit?${buildParams(offset)}`, {
        cache: "no-store",
      })

      const data: AuditResponse = await res.json()

      if (data?.ok) {
        const rawRecords: AuditRecordRaw[] = Array.isArray(data.records)
          ? data.records
          : []

        const normalized = rawRecords.map((r, index) =>
          normalizeRecord(r, offset + index)
        )

        if (reset) {
          setRecords(normalized)
        } else {
          setRecords((prev) => [...prev, ...normalized])
        }

        setTotalAvailable(data.total || 0)
        setHasMore(Boolean(data.hasMore))
        setError("")
      } else {
        if (reset) {
          setRecords([])
        }
        setTotalAvailable(0)
        setHasMore(false)
        setError(data?.error || "Errore caricamento audit.")
      }
    } catch {
      if (reset) {
        setRecords([])
      }
      setTotalAvailable(0)
      setHasMore(false)
      setError("Errore di connessione.")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  function resetFiltri() {
    setQ("")
    setOperatore("")
    setAzione("")
    setZona("")
    setDettaglio("")
    setTarga("")
    setChiave("")
    setDataDa("")
    setDataA("")
  }

  useEffect(() => {
    loadAudit(true)
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

      <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ricerca generale..."
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
          />

          <input
            value={operatore}
            onChange={(e) => setOperatore(e.target.value)}
            placeholder="Operatore"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
          />

          <input
            value={azione}
            onChange={(e) => setAzione(e.target.value)}
            placeholder="Azione"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
          />

          <input
            value={zona}
            onChange={(e) => setZona(e.target.value)}
            placeholder="Zona"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
          />

          <input
            value={targa}
            onChange={(e) => setTarga(e.target.value.toUpperCase())}
            placeholder="Targa"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm uppercase outline-none focus:border-blue-500"
          />

          <input
            value={chiave}
            onChange={(e) => setChiave(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="Chiave"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
          />

          <input
            value={dettaglio}
            onChange={(e) => setDettaglio(e.target.value)}
            placeholder="Dettaglio"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={dataDa}
              onChange={(e) => setDataDa(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
            <input
              type="date"
              value={dataA}
              onChange={(e) => setDataA(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <button
            onClick={() => loadAudit(true)}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Filtra
          </button>

          <button
            onClick={() => {
              resetFiltri()
              setTimeout(() => loadAudit(true), 0)
            }}
            className="rounded-2xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-300"
          >
            Reset filtri
          </button>

          <button
            onClick={exportCSV}
            className="rounded-2xl bg-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Export CSV
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Record caricati</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {loading ? "..." : totalRecords}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Totale disponibili</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {loading ? "..." : totalAvailable}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Ultimo aggiornamento</div>
          <div className="mt-1 text-base font-semibold text-slate-900">
            {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-slate-600">
          Visualizzati <span className="font-semibold">{totalRecords}</span> di{" "}
          <span className="font-semibold">{totalAvailable}</span> eventi.
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
              <tr key={`${r.id}-${r.created_at}`} className="border-t border-slate-100 align-top">
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
                    {r.azione || "NON RILEVATA"}
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
                    {r.esito || "OK"}
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
            key={`${r.id}-${r.created_at}`}
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
                {r.esito || "OK"}
              </span>
            </div>

            <div className="mb-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getAzioneBadgeClass(
                  r.azione
                )}`}
              >
                {r.azione || "NON RILEVATA"}
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

      {hasMore && !loading && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => loadAudit(false)}
            disabled={loadingMore}
            className="rounded-2xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {loadingMore ? "Caricamento..." : "Carica altri 250"}
          </button>
        </div>
      )}

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
