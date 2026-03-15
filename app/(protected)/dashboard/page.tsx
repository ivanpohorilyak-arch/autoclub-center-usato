"use client"

import { useEffect, useState } from "react"
import { Topbar } from "../../../components/layout/topbar"

type DashboardResponse = {
  ok: boolean
  filtri: {
    periodo: string
    operatore: string
  }
  kpi: {
    totale_piazzale: number
    ingressi: number
    spostamenti: number
    consegne: number
    ripristini: number
    operatori_attivi: number
  }
  chiavi: {
    totali: number
    occupate: number
    libere: number
    percentuale_occupazione: number
    duplicati: Array<{
      numero_chiave: number
      targhe: string[]
    }>
  }
  ferme: {
    giorni_7: number
    giorni_14: number
    giorni_30: number
    elenco: Array<{
      targa: string
      marca_modello: string | null
      numero_chiave: number | null
      zona_id: string | null
      zona_attuale: string | null
      data_ingresso: string | null
      giorni_ferma: number
    }>
  }
  zone: Array<{
    zona_id: string
    zona_nome: string
    presenti: number
    ingressi: number
    spostamenti: number
    consegne: number
  }>
  operatori: string[]
}

const PERIODI = [
  { value: "oggi", label: "Oggi" },
  { value: "ieri", label: "Ieri" },
  { value: "ultimi_7_giorni", label: "Ultimi 7 giorni" },
  { value: "ultimi_30_giorni", label: "Ultimi 30 giorni" },
]

function getFermoBadgeClass(giorni: number) {
  if (giorni >= 30) return "bg-red-100 text-red-700"
  if (giorni >= 14) return "bg-amber-100 text-amber-700"
  if (giorni >= 7) return "bg-yellow-100 text-yellow-700"
  return "bg-slate-100 text-slate-700"
}

export default function DashboardPage() {
  const [periodo, setPeriodo] = useState("oggi")
  const [operatore, setOperatore] = useState("Tutti")
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showScrollTop, setShowScrollTop] = useState(false)

  async function loadDashboard(nextPeriodo = periodo, nextOperatore = operatore) {
    setLoading(true)
    setError("")

    try {
      const res = await fetch(
        `/api/dashboard?periodo=${encodeURIComponent(
          nextPeriodo
        )}&operatore=${encodeURIComponent(nextOperatore)}`,
        { cache: "no-store" }
      )

      const json = await res.json()

      if (!res.ok || !json?.ok) {
        setError(json?.error || "Errore caricamento dashboard.")
        setData(null)
        return
      }

      setData(json)
    } catch {
      setError("Errore di connessione.")
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
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

  function scrollTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  const progressWidth = `${data?.chiavi.percentuale_occupazione ?? 0}%`

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <Topbar />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cruscotto operativo del parco usato.
        </p>
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-violet-500"
        >
          {PERIODI.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        <select
          value={operatore}
          onChange={(e) => setOperatore(e.target.value)}
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-violet-500"
        >
          <option value="Tutti">Tutti gli operatori</option>
          {data?.operatori?.map((nome) => (
            <option key={nome} value={nome}>
              {nome}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => loadDashboard(periodo, operatore)}
          disabled={loading}
          className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {loading ? "Aggiornamento..." : "Aggiorna"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Vetture in piazzale</div>
          <div className="mt-1 text-3xl font-bold text-slate-900">
            {loading ? "..." : data?.kpi.totale_piazzale ?? 0}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Ingressi</div>
          <div className="mt-1 text-3xl font-bold text-blue-700">
            {loading ? "..." : data?.kpi.ingressi ?? 0}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Spostamenti</div>
          <div className="mt-1 text-3xl font-bold text-amber-600">
            {loading ? "..." : data?.kpi.spostamenti ?? 0}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Consegne</div>
          <div className="mt-1 text-3xl font-bold text-emerald-700">
            {loading ? "..." : data?.kpi.consegne ?? 0}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Ripristini</div>
          <div className="mt-1 text-3xl font-bold text-rose-600">
            {loading ? "..." : data?.kpi.ripristini ?? 0}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Operatori attivi</div>
          <div className="mt-1 text-3xl font-bold text-slate-900">
            {loading ? "..." : data?.kpi.operatori_attivi ?? 0}
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Monitoraggio vetture ferme</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-yellow-50 p-4">
            <div className="text-sm text-slate-500">Ferme da 7+ giorni</div>
            <div className="mt-1 text-2xl font-bold text-yellow-700">
              {loading ? "..." : data?.ferme.giorni_7 ?? 0}
            </div>
          </div>

          <div className="rounded-2xl bg-amber-50 p-4">
            <div className="text-sm text-slate-500">Ferme da 14+ giorni</div>
            <div className="mt-1 text-2xl font-bold text-amber-700">
              {loading ? "..." : data?.ferme.giorni_14 ?? 0}
            </div>
          </div>

          <div className="rounded-2xl bg-red-50 p-4">
            <div className="text-sm text-slate-500">Ferme da 30+ giorni</div>
            <div className="mt-1 text-2xl font-bold text-red-700">
              {loading ? "..." : data?.ferme.giorni_30 ?? 0}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <h3 className="mb-3 text-base font-bold text-slate-900">
            Vetture più ferme
          </h3>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-700">
                <tr>
                  <th className="px-3 py-3">Targa</th>
                  <th className="px-3 py-3">Marca / Modello</th>
                  <th className="px-3 py-3">Zona</th>
                  <th className="px-3 py-3">Chiave</th>
                  <th className="px-3 py-3">Data ingresso</th>
                  <th className="px-3 py-3">Fermo</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      Caricamento...
                    </td>
                  </tr>
                )}

                {!loading && (data?.ferme.elenco.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      Nessuna vettura trovata.
                    </td>
                  </tr>
                )}

                {data?.ferme.elenco.map((v) => (
                  <tr key={v.targa} className="border-t border-slate-100">
                    <td className="px-3 py-3 font-semibold text-slate-900">
                      {v.targa}
                    </td>
                    <td className="px-3 py-3">{v.marca_modello || "-"}</td>
                    <td className="px-3 py-3">{v.zona_attuale || v.zona_id || "-"}</td>
                    <td className="px-3 py-3">{v.numero_chiave ?? "-"}</td>
                    <td className="px-3 py-3">
                      {v.data_ingresso
                        ? new Date(v.data_ingresso).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getFermoBadgeClass(
                          v.giorni_ferma
                        )}`}
                      >
                        {v.giorni_ferma} giorni
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {loading && (
              <div className="rounded-3xl bg-slate-50 p-4 text-center text-slate-500">
                Caricamento...
              </div>
            )}

            {!loading && (data?.ferme.elenco.length ?? 0) === 0 && (
              <div className="rounded-3xl bg-slate-50 p-4 text-center text-slate-500">
                Nessuna vettura trovata.
              </div>
            )}

            {data?.ferme.elenco.map((v) => (
              <div
                key={v.targa}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-bold text-slate-900">{v.targa}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {v.marca_modello || "-"}
                    </div>
                  </div>

                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getFermoBadgeClass(
                      v.giorni_ferma
                    )}`}
                  >
                    {v.giorni_ferma} gg
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-sm">
                  <div>
                    <span className="text-slate-500">Zona:</span>{" "}
                    <span className="font-medium text-slate-900">
                      {v.zona_attuale || v.zona_id || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Chiave:</span>{" "}
                    <span className="font-medium text-slate-900">
                      {v.numero_chiave ?? "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Ingresso:</span>{" "}
                    <span className="font-medium text-slate-900">
                      {v.data_ingresso
                        ? new Date(v.data_ingresso).toLocaleDateString()
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Occupazione chiavi 1–520</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Chiavi occupate</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {loading ? "..." : data?.chiavi.occupate ?? 0}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Chiavi libere</div>
            <div className="mt-1 text-2xl font-bold text-emerald-700">
              {loading ? "..." : data?.chiavi.libere ?? 0}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-sm text-slate-500">Percentuale occupazione</div>
            <div className="mt-1 text-2xl font-bold text-violet-700">
              {loading ? "..." : `${data?.chiavi.percentuale_occupazione ?? 0}%`}
            </div>
          </div>
        </div>

        <div className="mt-4 h-4 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-violet-600 transition-all"
            style={{ width: progressWidth }}
          />
        </div>
      </div>

      <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Controllo chiavi duplicate</h2>

        {loading ? (
          <div className="mt-4 text-sm text-slate-500">Controllo in corso...</div>
        ) : (data?.chiavi.duplicati.length ?? 0) === 0 ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Nessuna chiave duplicata rilevata.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {data?.chiavi.duplicati.map((dup) => (
              <div
                key={dup.numero_chiave}
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <span className="font-semibold">Chiave {dup.numero_chiave}:</span>{" "}
                {dup.targhe.join(", ")}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-slate-900">KPI per zona</h2>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-700">
              <tr>
                <th className="px-3 py-3">Zona</th>
                <th className="px-3 py-3">Presenti</th>
                <th className="px-3 py-3">Ingressi</th>
                <th className="px-3 py-3">Spostamenti</th>
                <th className="px-3 py-3">Consegne</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    Caricamento...
                  </td>
                </tr>
              )}

              {!loading &&
                data?.zone.map((z) => (
                  <tr key={z.zona_id} className="border-t border-slate-100">
                    <td className="px-3 py-3 font-medium text-slate-900">
                      {z.zona_id} - {z.zona_nome}
                    </td>
                    <td className="px-3 py-3">{z.presenti}</td>
                    <td className="px-3 py-3 text-blue-700">{z.ingressi}</td>
                    <td className="px-3 py-3 text-amber-700">{z.spostamenti}</td>
                    <td className="px-3 py-3 text-emerald-700">{z.consegne}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 md:hidden">
          {loading && (
            <div className="rounded-3xl bg-slate-50 p-4 text-center text-slate-500">
              Caricamento...
            </div>
          )}

          {!loading &&
            data?.zone.map((z) => (
              <div
                key={z.zona_id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="text-lg font-bold text-slate-900">
                  {z.zona_id} - {z.zona_nome}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-500">Presenti:</span>{" "}
                    <span className="font-semibold text-slate-900">
                      {z.presenti}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Ingressi:</span>{" "}
                    <span className="font-semibold text-blue-700">
                      {z.ingressi}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Spostamenti:</span>{" "}
                    <span className="font-semibold text-amber-700">
                      {z.spostamenti}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Consegne:</span>{" "}
                    <span className="font-semibold text-emerald-700">
                      {z.consegne}
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>
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
