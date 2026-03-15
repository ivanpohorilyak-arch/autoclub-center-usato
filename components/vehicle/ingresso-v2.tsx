"use client"

import { useMemo, useState } from "react"
import { QrZoneScanner } from "../scanner/qr-zone-scanner"
import { ZONE_INFO } from "../../lib/zones"

type ZoneId = keyof typeof ZONE_INFO

export function IngressoV2() {
  const [zonaId, setZonaId] = useState<ZoneId | "">("")
  const [zonaNome, setZonaNome] = useState("")
  const [targa, setTarga] = useState("")
  const [marca, setMarca] = useState("")
  const [modello, setModello] = useState("")
  const [colore, setColore] = useState("")
  const [km, setKm] = useState("")
  const [numeroChiave, setNumeroChiave] = useState("")
  const [note, setNote] = useState("")
  const [feedback, setFeedback] = useState("")

  const zonaSelezionata = useMemo(() => {
    if (!zonaId) return null
    return { zonaId, zonaNome }
  }, [zonaId, zonaNome])

  const targaNormalizzata = targa.toUpperCase().replace(/\s/g, "")
  const targaValida = /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/.test(targaNormalizzata)

  function handleZoneDetected(payload: {
    zonaId: ZoneId
    zonaNome: string
    rawValue: string
  }) {
    setZonaId(payload.zonaId)
    setZonaNome(payload.zonaNome)
    setFeedback(`Zona selezionata: ${payload.zonaId} · ${payload.zonaNome}`)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!zonaId) {
      setFeedback("Prima devi leggere il QR della zona.")
      return
    }

    if (!targaValida) {
      setFeedback("La targa non è valida. Formato atteso: AA123BB.")
      return
    }

    setFeedback("Form pronto. Nel prossimo step collegheremo il salvataggio al database.")
  }

  function resetForm() {
    setTarga("")
    setMarca("")
    setModello("")
    setColore("")
    setKm("")
    setNumeroChiave("")
    setNote("")
    setFeedback("")
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <QrZoneScanner onDetected={handleZoneDetected} />

      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">Zona selezionata</h3>

          {zonaSelezionata ? (
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="text-sm font-semibold text-emerald-700">{zonaSelezionata.zonaId}</div>
              <div className="text-sm text-emerald-800">{zonaSelezionata.zonaNome}</div>
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Nessuna zona rilevata.
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900">Dati vettura</h3>
            <p className="text-sm text-slate-500">
              Form già pronto per il collegamento al salvataggio reale.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Targa</label>
              <input
                value={targa}
                onChange={(e) => setTarga(e.target.value.toUpperCase())}
                placeholder="AA123BB"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
              <div className="mt-2 text-xs">
                {targa.length === 0 ? null : targaValida ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                    Targa valida
                  </span>
                ) : (
                  <span className="rounded-full bg-red-50 px-3 py-1 font-medium text-red-700">
                    Formato non valido
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Marca</label>
              <input
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Modello</label>
              <input
                value={modello}
                onChange={(e) => setModello(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Colore</label>
              <input
                value={colore}
                onChange={(e) => setColore(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">KM</label>
              <input
                value={km}
                onChange={(e) => setKm(e.target.value)}
                inputMode="numeric"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Numero chiave
              </label>
              <input
                value={numeroChiave}
                onChange={(e) => setNumeroChiave(e.target.value)}
                inputMode="numeric"
                placeholder="0 = Commerciante"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Note</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {feedback ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {feedback}
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              className="rounded-2xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              Registra vettura
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-300"
            >
              Pulisci campi
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
