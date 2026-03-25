"use client"

import { useEffect, useMemo, useState } from "react"
import { Topbar } from "../../../components/layout/topbar"
import QRCode from "qrcode"

type Zona = {
  id: string
  nome: string
}

type QrItem = {
  zonaId: string
  zonaNome: string
  value: string
  dataUrl: string
}

async function buildQrDataUrl(value: string) {
  return QRCode.toDataURL(value, {
    width: 420,
    margin: 2,
  })
}

export default function StampaQrZonePage() {
  const [zone, setZone] = useState<Zona[]>([])
  const [zoneLoading, setZoneLoading] = useState(true)
  const [selectedZonaId, setSelectedZonaId] = useState("")
  const [singleQrUrl, setSingleQrUrl] = useState("")
  const [loadingSingle, setLoadingSingle] = useState(false)
  const [loadingAll, setLoadingAll] = useState(false)
  const [allQrs, setAllQrs] = useState<QrItem[]>([])
  const [error, setError] = useState("")

  const zoneMap = useMemo(() => {
    return new Map(zone.map((z) => [z.id, z.nome]))
  }, [zone])

  useEffect(() => {
    let active = true

    async function loadZone() {
      try {
        setZoneLoading(true)
        setError("")

        const res = await fetch("/api/zone", {
          method: "GET",
          cache: "no-store",
        })

        const data = await res.json()

        if (!res.ok || !data.ok) {
          throw new Error(data?.error || "Errore caricamento zone")
        }

        const rows: Zona[] = Array.isArray(data.zone) ? data.zone : []

        if (!active) return

        setZone(rows)

        if (rows.length > 0) {
          setSelectedZonaId((prev) => {
            if (prev && rows.some((z) => z.id === prev)) return prev
            return rows[0].id
          })
        } else {
          setSelectedZonaId("")
        }
      } catch (err) {
        console.error("LOAD ZONE ERROR:", err)
        if (active) {
          setZone([])
          setSelectedZonaId("")
          setError("Errore caricamento zone.")
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

  async function generaQrSingolo(zonaId: string) {
    try {
      setLoadingSingle(true)
      setError("")

      const zonaNome = zoneMap.get(zonaId)
      if (!zonaNome) {
        setError("Zona non valida.")
        return
      }

      const value = `ZONA|${zonaId}`
      const dataUrl = await buildQrDataUrl(value)
      setSingleQrUrl(dataUrl)
    } catch {
      setError("Errore generazione QR singolo.")
    } finally {
      setLoadingSingle(false)
    }
  }

  async function generaSetCompleto() {
    try {
      setLoadingAll(true)
      setError("")

      const results = await Promise.all(
        zone.map(async ({ id, nome }) => {
          const value = `ZONA|${id}`
          const dataUrl = await buildQrDataUrl(value)

          return {
            zonaId: id,
            zonaNome: nome,
            value,
            dataUrl,
          }
        })
      )

      setAllQrs(results)
    } catch {
      setError("Errore generazione set completo QR.")
    } finally {
      setLoadingAll(false)
    }
  }

  function downloadDataUrl(dataUrl: string, fileName: string) {
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = fileName
    a.click()
  }

  function stampaSingolo() {
    if (!singleQrUrl || !selectedZonaId) return

    const zonaNome = zoneMap.get(selectedZonaId) || ""
    const value = `ZONA|${selectedZonaId}`

    const w = window.open("", "_blank", "width=900,height=700")
    if (!w) return

    w.document.write(`
      <html>
        <head>
          <title>QR ${selectedZonaId}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 30px;
            }
            .card {
              border: 2px solid #111;
              border-radius: 16px;
              display: inline-block;
              padding: 24px;
            }
            h1 {
              margin: 0 0 12px 0;
              font-size: 28px;
            }
            h2 {
              margin: 0 0 16px 0;
              font-size: 22px;
            }
            .code {
              margin-top: 16px;
              font-size: 20px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${selectedZonaId}</h1>
            <h2>${zonaNome}</h2>
            <img src="${singleQrUrl}" width="320" height="320" />
            <div class="code">${value}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `)

    w.document.close()
  }

  function stampaSetCompleto() {
    if (!allQrs.length) return

    const w = window.open("", "_blank", "width=1200,height=900")
    if (!w) return

    const cardsHtml = allQrs
      .map(
        (item) => `
          <div class="card">
            <div class="zona-id">${item.zonaId}</div>
            <div class="zona-nome">${item.zonaNome}</div>
            <img src="${item.dataUrl}" width="220" height="220" />
            <div class="code">${item.value}</div>
          </div>
        `
      )
      .join("")

    w.document.write(`
      <html>
        <head>
          <title>Set completo QR Zone</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
            }
            .card {
              border: 2px solid #111;
              border-radius: 16px;
              padding: 18px;
              text-align: center;
              page-break-inside: avoid;
            }
            .zona-id {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 8px;
            }
            .zona-nome {
              font-size: 18px;
              margin-bottom: 12px;
            }
            .code {
              margin-top: 12px;
              font-size: 16px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${cardsHtml}
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `)

    w.document.close()
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <Topbar />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Stampa QR Zone</h1>
        <p className="mt-1 text-sm text-slate-500">
          Genera, scarica e stampa i QR ufficiali delle zone operative.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">QR singolo</h2>

          <div className="mt-4 space-y-3">
            <select
              value={selectedZonaId}
              onChange={(e) => setSelectedZonaId(e.target.value)}
              disabled={zoneLoading || zone.length === 0}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-amber-500 disabled:opacity-60"
            >
              {zoneLoading ? (
                <option value="">Caricamento zone...</option>
              ) : zone.length === 0 ? (
                <option value="">Nessuna zona disponibile</option>
              ) : (
                zone.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.id} - {z.nome}
                  </option>
                ))
              )}
            </select>

            <button
              type="button"
              onClick={() => generaQrSingolo(selectedZonaId)}
              disabled={loadingSingle || !selectedZonaId || zoneLoading}
              className="w-full rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
            >
              {loadingSingle ? "Generazione..." : "Genera QR singolo"}
            </button>
          </div>

          {singleQrUrl && selectedZonaId && (
            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
              <div className="text-xl font-bold text-slate-900">{selectedZonaId}</div>
              <div className="mt-1 text-sm text-slate-600">
                {zoneMap.get(selectedZonaId) || ""}
              </div>

              <img
                src={singleQrUrl}
                alt={`QR ${selectedZonaId}`}
                className="mx-auto mt-4 h-72 w-72 rounded-2xl bg-white p-3"
              />

              <div className="mt-2 text-sm font-semibold text-slate-700">
                ZONA|{selectedZonaId}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadDataUrl(singleQrUrl, `QR_${selectedZonaId}.png`)
                  }
                  className="rounded-2xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Download PNG
                </button>

                <button
                  type="button"
                  onClick={stampaSingolo}
                  className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Stampa QR
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Set completo QR zone</h2>
          <p className="mt-1 text-sm text-slate-500">
            Genera l’intero set ufficiale di QR zone pronto per stampa e distribuzione.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={generaSetCompleto}
              disabled={loadingAll || zoneLoading || zone.length === 0}
              className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
            >
              {loadingAll ? "Generazione set..." : "Genera set completo"}
            </button>

            <button
              type="button"
              onClick={stampaSetCompleto}
              disabled={!allQrs.length}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              Stampa set completo
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {allQrs.map((item) => (
              <div
                key={item.zonaId}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center"
              >
                <div className="text-lg font-bold text-slate-900">{item.zonaId}</div>
                <div className="mt-1 min-h-[40px] text-xs text-slate-600">
                  {item.zonaNome}
                </div>

                <img
                  src={item.dataUrl}
                  alt={`QR ${item.zonaId}`}
                  className="mx-auto mt-3 h-44 w-44 rounded-2xl bg-white p-2"
                />

                <div className="mt-2 text-xs font-semibold text-slate-700">
                  {item.value}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    downloadDataUrl(item.dataUrl, `QR_${item.zonaId}.png`)
                  }
                  className="mt-3 w-full rounded-2xl bg-slate-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Download PNG
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
