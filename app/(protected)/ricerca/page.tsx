"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Topbar } from "../../../components/layout/topbar"
import { QrZoneScanner } from "@/components/scanner/qr-zone-scanner"

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

type StoricoItem = {
  azione: string
  dettaglio: string | null
  utente: string | null
  numero_chiave: number | null
  created_at: string
}

type Permessi = {
  can_consegna: boolean
  can_modifica_targa: boolean
}

type ScanResult = {
  zonaId: string
  zonaNome: string
  rawValue: string
}

type Suggerimento = {
  targa: string
  marca_modello: string | null
  colore: string | null
  numero_chiave: number | null
  zona_attuale: string | null
  stato: string | null
}

type RicercaRecente = {
  id: number
  query: string
  targa: string | null
  numero_chiave: number | null
  marca_modello: string | null
  colore: string | null
  stato: string | null
  created_at: string
}

export default function RicercaPage() {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingSuggerimenti, setLoadingSuggerimenti] = useState(false)
  const [loadingRecenti, setLoadingRecenti] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [vettura, setVettura] = useState<Vettura | null>(null)
  const [storico, setStorico] = useState<StoricoItem[]>([])
  const [permessi, setPermessi] = useState<Permessi>({
    can_consegna: false,
    can_modifica_targa: false,
  })

  const [recenti, setRecenti] = useState<RicercaRecente[]>([])
  const [suggerimenti, setSuggerimenti] = useState<Suggerimento[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [azioneAttiva, setAzioneAttiva] = useState<"sposta" | "modifica" | "consegna" | null>(
    null
  )

  const [zonaScansionata, setZonaScansionata] = useState<ScanResult | null>(null)
  const [scannerSpostamentoAttivo, setScannerSpostamentoAttivo] = useState(false)
  const [notaSpostamento, setNotaSpostamento] = useState("")
  const [confermaSpostamento, setConfermaSpostamento] = useState(false)
  const [processing, setProcessing] = useState(false)

  const [formModifica, setFormModifica] = useState({
    targa: "",
    marca_modello: "",
    colore: "",
    km: "",
    numero_chiave: "",
    note: "",
  })

  const [confermaModifica, setConfermaModifica] = useState(false)
  const [confermaConsegna, setConfermaConsegna] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)

  const actionSectionRef = useRef<HTMLDivElement | null>(null)
  const searchAreaRef = useRef<HTMLDivElement | null>(null)

  async function caricaRecenti() {
    setLoadingRecenti(true)

    try {
      const res = await fetch("/api/ricerca?recent=true", {
        cache: "no-store",
      })

      const json = await res.json()

      if (!res.ok || !json.ok) {
        setRecenti([])
        return
      }

      setRecenti(json.recenti || [])
    } catch {
      setRecenti([])
    } finally {
      setLoadingRecenti(false)
    }
  }

  async function caricaSuggerimenti(searchValue: string) {
    const q = searchValue.trim()

    if (!q) {
      setSuggerimenti([])
      return
    }

    setLoadingSuggerimenti(true)

    try {
      const res = await fetch(`/api/ricerca?suggest=true&q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      })

      const json = await res.json()

      if (!res.ok || !json.ok) {
        setSuggerimenti([])
        return
      }

      setSuggerimenti(json.suggerimenti || [])
    } catch {
      setSuggerimenti([])
    } finally {
      setLoadingSuggerimenti(false)
    }
  }

  async function cerca(forcedQuery?: string) {
    const searchValue = (forcedQuery ?? query).trim()

    if (!searchValue) {
      setError("")
      setMessage("")
      setVettura(null)
      setStorico([])
      setAzioneAttiva(null)
      setSuggerimenti([])
      setShowSuggestions(true)
      await caricaRecenti()
      return
    }

    setLoading(true)
    setError("")
    setMessage("")
    setVettura(null)
    setStorico([])
    setAzioneAttiva(null)
    setZonaScansionata(null)
    setScannerSpostamentoAttivo(false)
    setNotaSpostamento("")
    setConfermaSpostamento(false)
    setConfermaModifica(false)
    setConfermaConsegna(false)
    setShowSuggestions(false)

    try {
      const res = await fetch(`/api/ricerca?q=${encodeURIComponent(searchValue)}`, {
        cache: "no-store",
      })

      const json = await res.json()

      if (!res.ok || !json.ok) {
        setError(json.error || "Vettura non trovata.")
        setVettura(null)
        setStorico([])
        setShowSuggestions(true)
        await caricaRecenti()
        return
      }

      setQuery(json.veicolo.targa || searchValue)
      setVettura(json.veicolo)
      setStorico(json.storico || [])
      setPermessi(
        json.permessi || {
          can_consegna: false,
          can_modifica_targa: false,
        }
      )

      setFormModifica({
        targa: json.veicolo.targa || "",
        marca_modello: json.veicolo.marca_modello || "",
        colore: json.veicolo.colore || "",
        km: json.veicolo.km != null ? String(json.veicolo.km) : "",
        numero_chiave:
          json.veicolo.numero_chiave != null ? String(json.veicolo.numero_chiave) : "",
        note: json.veicolo.note || "",
      })

      await caricaRecenti()
    } catch {
      setError("Errore di connessione.")
      setShowSuggestions(true)
      await caricaRecenti()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void caricaRecenti()
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQuery(query)
    }, 350)

    return () => window.clearTimeout(t)
  }, [query])

  useEffect(() => {
    const q = debouncedQuery.trim()

    if (!q) {
      setSuggerimenti([])
      setShowSuggestions(true)
      return
    }

    void caricaSuggerimenti(q)
    setShowSuggestions(true)
  }, [debouncedQuery])

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

  useEffect(() => {
    if (!azioneAttiva) return

    const t = window.setTimeout(() => {
      actionSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }, 120)

    return () => window.clearTimeout(t)
  }, [azioneAttiva])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!searchAreaRef.current) return
      if (!searchAreaRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  function resetMessaggi() {
    setError("")
    setMessage("")
  }

  function apriAzione(tipo: "sposta" | "modifica" | "consegna") {
    resetMessaggi()
    setAzioneAttiva(tipo)
    setZonaScansionata(null)
    setScannerSpostamentoAttivo(false)
    setNotaSpostamento("")
    setConfermaSpostamento(false)
    setConfermaModifica(false)
    setConfermaConsegna(false)
  }

  async function confermaMovimento() {
    if (!vettura || !zonaScansionata) return

    setProcessing(true)
    resetMessaggi()

    try {
      const res = await fetch("/api/spostamento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targa: vettura.targa,
          zonaId: zonaScansionata.zonaId,
          nota: notaSpostamento,
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.ok) {
        setError(json.error || "Errore spostamento.")
        return
      }

      setMessage(`Vettura spostata correttamente in ${json.nuovaZona}.`)
      setQuery(vettura.targa)
      await cerca(vettura.targa)
      setAzioneAttiva(null)
      setZonaScansionata(null)
      setScannerSpostamentoAttivo(false)
      setNotaSpostamento("")
      setConfermaSpostamento(false)
    } catch {
      setError("Errore di connessione durante lo spostamento.")
    } finally {
      setProcessing(false)
    }
  }

  const modifiche = useMemo(() => {
    if (!vettura) return []

    const changes: Array<{ label: string; from: string; to: string }> = []

    const pushIfChanged = (label: string, oldValue: unknown, newValue: unknown) => {
      const oldStr = String(oldValue ?? "").trim()
      const newStr = String(newValue ?? "").trim()
      if (oldStr !== newStr) {
        changes.push({ label, from: oldStr || "-", to: newStr || "-" })
      }
    }

    pushIfChanged("Targa", vettura.targa, formModifica.targa.toUpperCase())
    pushIfChanged(
      "Marca / Modello",
      vettura.marca_modello,
      formModifica.marca_modello.toUpperCase()
    )
    pushIfChanged("Colore", vettura.colore, formModifica.colore)
    pushIfChanged("KM", vettura.km, formModifica.km)
    pushIfChanged("Numero chiave", vettura.numero_chiave, formModifica.numero_chiave)
    pushIfChanged("Note", vettura.note, formModifica.note)

    return changes
  }, [vettura, formModifica])

  async function salvaModifica() {
    if (!vettura) return

    setProcessing(true)
    resetMessaggi()

    try {
      const res = await fetch("/api/modifica", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targaOriginale: vettura.targa,
          targa: formModifica.targa.toUpperCase(),
          marca_modello: formModifica.marca_modello.toUpperCase(),
          colore: formModifica.colore,
          km: formModifica.km === "" ? null : Number(formModifica.km),
          numero_chiave:
            formModifica.numero_chiave === "" ? null : Number(formModifica.numero_chiave),
          note: formModifica.note,
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.ok) {
        setError(json.error || "Errore modifica.")
        return
      }

      setMessage("Dati vettura aggiornati correttamente.")
      setQuery(formModifica.targa.toUpperCase())
      await cerca(formModifica.targa.toUpperCase())
      setAzioneAttiva(null)
      setConfermaModifica(false)
    } catch {
      setError("Errore di connessione durante la modifica.")
    } finally {
      setProcessing(false)
    }
  }

  async function eseguiConsegna() {
    if (!vettura) return

    setProcessing(true)
    resetMessaggi()

    try {
      const res = await fetch("/api/consegna", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targa: vettura.targa,
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.ok) {
        setError(json.error || "Errore consegna.")
        return
      }

      setMessage(`Vettura ${vettura.targa} consegnata correttamente.`)
      setVettura(null)
      setStorico([])
      setAzioneAttiva(null)
      setConfermaConsegna(false)
      setQuery("")
      setShowSuggestions(true)
      await caricaRecenti()
    } catch {
      setError("Errore di connessione durante la consegna.")
    } finally {
      setProcessing(false)
    }
  }

  function scrollTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  function handleSelectSuggerimento(item: Suggerimento) {
    setQuery(item.targa)
    setSuggerimenti([])
    setShowSuggestions(false)
    void cerca(item.targa)
  }

  function handleSelectRecente(item: RicercaRecente) {
    const nextValue =
      item.targa || (item.numero_chiave != null ? String(item.numero_chiave) : item.query)

    setQuery(nextValue)
    setShowSuggestions(false)
    void cerca(nextValue)
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <Topbar />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Ricerca</h1>
        <p className="text-sm text-slate-500">Ricerca vettura per targa o numero chiave</p>
      </div>

      <div
        ref={searchAreaRef}
        className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value.toUpperCase())
              setError("")
              setMessage("")
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void cerca()
              }
            }}
            placeholder="Inserisci targa o numero chiave..."
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-violet-500"
          />

          <button
            onClick={() => void cerca()}
            disabled={loading}
            className="rounded-2xl bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {loading ? "Ricerca..." : "Cerca"}
          </button>
        </div>

        {showSuggestions && !vettura && (
          <div className="mt-4 space-y-3">
            {query.trim() ? (
              <>
                <div className="text-sm font-semibold text-slate-700">
                  Suggerimenti ricerca
                </div>

                {loadingSuggerimenti ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    Caricamento suggerimenti...
                  </div>
                ) : suggerimenti.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    Nessun suggerimento disponibile.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {suggerimenti.map((item) => (
                      <button
                        key={`${item.targa}-${item.numero_chiave ?? "na"}`}
                        type="button"
                        onClick={() => handleSelectSuggerimento(item)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:bg-slate-100"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-base font-bold text-slate-900">
                              {item.targa}
                            </div>
                            <div className="mt-1 text-sm text-slate-600">
                              {item.marca_modello || "-"}
                            </div>
                          </div>

                          <div className="text-right text-sm text-slate-500">
                            <div>Chiave: {item.numero_chiave ?? "-"}</div>
                            <div>{item.zona_attuale || "-"}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
                  Nessuna ricerca attiva. Puoi riprendere rapidamente da una delle tue ultime ricerche.
                </div>

                <div className="text-sm font-semibold text-slate-700">
                  Le tue ultime ricerche
                </div>

                {loadingRecenti ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    Caricamento ultime ricerche...
                  </div>
                ) : recenti.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    Nessuna ricerca recente disponibile.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recenti.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectRecente(item)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:bg-slate-100"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-base font-bold text-slate-900">
                              {item.targa || item.query}
                            </div>
                            <div className="mt-1 text-sm text-slate-600">
                              {item.marca_modello || "Ricerca salvata"}
                            </div>
                          </div>

                          <div className="text-right text-sm text-slate-500">
                            <div>
                              {item.numero_chiave != null
                                ? `Chiave: ${item.numero_chiave}`
                                : "Chiave: -"}
                            </div>
                            <div>{new Date(item.created_at).toLocaleString()}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {error && recenti.length > 0 && !vettura && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-900">
              Ultime ricerche disponibili
            </div>

            <div className="space-y-2">
              {recenti.map((item) => (
                <button
                  key={`errore-recente-${item.id}`}
                  type="button"
                  onClick={() => handleSelectRecente(item)}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-100"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-bold text-slate-900">
                        {item.targa || item.query}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {item.marca_modello || "Ricerca salvata"}
                      </div>
                    </div>

                    <div className="text-right text-sm text-slate-500">
                      <div>
                        {item.numero_chiave != null
                          ? `Chiave: ${item.numero_chiave}`
                          : "Chiave: -"}
                      </div>
                      <div>{new Date(item.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {message && (
          <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}
      </div>

      {vettura && (
        <>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-2xl font-bold text-slate-900">{vettura.targa}</div>
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
              <button
                onClick={() => apriAzione("sposta")}
                className="rounded-2xl bg-amber-500 px-4 py-3 font-semibold text-white hover:bg-amber-600"
              >
                Sposta vettura
              </button>

              <button
                onClick={() => apriAzione("modifica")}
                className="rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Modifica dati
              </button>

              <button
                onClick={() => apriAzione("consegna")}
                className="rounded-2xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700"
              >
                Consegna vettura
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-slate-900">Storico movimenti</h2>

            {storico.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Nessuno storico disponibile.
              </div>
            ) : (
              <div className="space-y-3">
                {storico.map((r, index) => (
                  <div
                    key={`${r.created_at}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="font-semibold text-slate-900">{r.azione || "-"}</div>
                      <div className="text-xs text-slate-500">
                        {r.created_at ? new Date(r.created_at).toLocaleString() : "-"}
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-slate-700">
                      {r.dettaglio || "-"}
                    </div>

                    <div className="mt-2 text-xs text-slate-500">
                      Utente: {r.utente || "-"} · Chiave: {r.numero_chiave ?? "-"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {azioneAttiva && <div ref={actionSectionRef} className="pt-2" />}

          {azioneAttiva === "sposta" && (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Sposta vettura</h2>
              <p className="mt-2 text-sm text-slate-500">
                Lo spostamento è possibile solo con scansione del QR della nuova zona.
              </p>

              {!scannerSpostamentoAttivo && !zonaScansionata && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="text-sm text-amber-800">
                    Per una scansione stabile su mobile, attiva manualmente lo scanner QR.
                  </div>

                  <button
                    type="button"
                    onClick={() => setScannerSpostamentoAttivo(true)}
                    className="mt-3 rounded-2xl bg-amber-500 px-5 py-3 font-semibold text-white hover:bg-amber-600"
                  >
                    Attiva scanner QR
                  </button>
                </div>
              )}

              {scannerSpostamentoAttivo && (
                <div className="mt-4">
                  <QrZoneScanner
                    onDetected={(result) => {
                      setZonaScansionata(result)
                      setScannerSpostamentoAttivo(false)
                      setConfermaSpostamento(false)
                      resetMessaggi()
                    }}
                  />
                </div>
              )}

              {scannerSpostamentoAttivo && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setScannerSpostamentoAttivo(false)}
                    className="rounded-2xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-300"
                  >
                    Ferma scanner
                  </button>
                </div>
              )}

              {zonaScansionata && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-sm text-emerald-700">Nuova zona rilevata</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {zonaScansionata.zonaId} - {zonaScansionata.zonaNome}
                  </div>
                </div>
              )}

              {zonaScansionata && vettura && (
                <div className="mt-4 rounded-2xl bg-amber-50 p-4">
                  <div className="mb-2 text-sm font-semibold text-slate-900">
                    Riepilogo spostamento
                  </div>
                  <div className="space-y-2 text-sm text-slate-700">
                    <div>
                      <span className="font-medium">Targa:</span> {vettura.targa}
                    </div>
                    <div>
                      <span className="font-medium">Da:</span>{" "}
                      {vettura.zona_attuale || vettura.zona_id || "-"}
                    </div>
                    <div>
                      <span className="font-medium">A:</span>{" "}
                      {zonaScansionata.zonaId} - {zonaScansionata.zonaNome}
                    </div>
                    <div>
                      <span className="font-medium">Chiave:</span>{" "}
                      {vettura.numero_chiave ?? "-"}
                    </div>
                  </div>
                </div>
              )}

              {zonaScansionata && (
                <button
                  type="button"
                  onClick={() => {
                    setZonaScansionata(null)
                    setConfermaSpostamento(false)
                    setScannerSpostamentoAttivo(true)
                  }}
                  className="mt-4 rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-700"
                >
                  Scansiona di nuovo
                </button>
              )}

              <textarea
                value={notaSpostamento}
                onChange={(e) => setNotaSpostamento(e.target.value)}
                placeholder="Nota spostamento (opzionale)"
                className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-amber-500"
              />

              {zonaScansionata && (
                <label className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={confermaSpostamento}
                    onChange={(e) => setConfermaSpostamento(e.target.checked)}
                  />
                  Confermo lo spostamento della vettura nella nuova zona rilevata
                </label>
              )}

              <div className="mt-4 flex flex-col gap-3 md:flex-row">
                <button
                  onClick={confermaMovimento}
                  disabled={!zonaScansionata || !confermaSpostamento || processing}
                  className="rounded-2xl bg-amber-500 px-5 py-3 font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                >
                  {processing ? "Spostamento..." : "Conferma spostamento"}
                </button>

                <button
                  onClick={() => {
                    setAzioneAttiva(null)
                    setZonaScansionata(null)
                    setScannerSpostamentoAttivo(false)
                    setNotaSpostamento("")
                    setConfermaSpostamento(false)
                  }}
                  className="rounded-2xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-300"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}

          {azioneAttiva === "modifica" && (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Modifica dati vettura</h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Targa
                  </label>
                  <input
                    value={formModifica.targa}
                    onChange={(e) =>
                      setFormModifica((prev) => ({
                        ...prev,
                        targa: e.target.value.toUpperCase(),
                      }))
                    }
                    disabled={!permessi.can_modifica_targa}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  {!permessi.can_modifica_targa && (
                    <div className="mt-2 text-sm text-amber-700">
                      La modifica targa è riservata agli operatori autorizzati.
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Marca / Modello
                  </label>
                  <input
                    value={formModifica.marca_modello}
                    onChange={(e) =>
                      setFormModifica((prev) => ({
                        ...prev,
                        marca_modello: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Colore
                  </label>
                  <input
                    value={formModifica.colore}
                    onChange={(e) =>
                      setFormModifica((prev) => ({
                        ...prev,
                        colore: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    KM
                  </label>
                  <input
                    value={formModifica.km}
                    onChange={(e) =>
                      setFormModifica((prev) => ({
                        ...prev,
                        km: e.target.value.replace(/[^\d]/g, ""),
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Numero chiave
                  </label>
                  <input
                    value={formModifica.numero_chiave}
                    onChange={(e) =>
                      setFormModifica((prev) => ({
                        ...prev,
                        numero_chiave: e.target.value.replace(/[^\d]/g, ""),
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Note
                  </label>
                  <textarea
                    value={formModifica.note}
                    onChange={(e) =>
                      setFormModifica((prev) => ({
                        ...prev,
                        note: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {modifiche.length > 0 && (
                <div className="mt-5 rounded-2xl bg-blue-50 p-4">
                  <div className="mb-2 text-sm font-semibold text-slate-900">
                    Riepilogo modifiche applicabili
                  </div>
                  <div className="space-y-2 text-sm text-slate-700">
                    {modifiche.map((m) => (
                      <div key={m.label}>
                        <span className="font-medium">{m.label}:</span> {m.from} → {m.to}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <label className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={confermaModifica}
                  onChange={(e) => setConfermaModifica(e.target.checked)}
                />
                Confermo le modifiche ai dati visualizzate sopra
              </label>

              <div className="mt-4 flex flex-col gap-3 md:flex-row">
                <button
                  onClick={salvaModifica}
                  disabled={processing || modifiche.length === 0 || !confermaModifica}
                  className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {processing ? "Salvataggio..." : "Conferma modifiche"}
                </button>

                <button
                  onClick={() => {
                    setAzioneAttiva(null)
                    setConfermaModifica(false)
                  }}
                  className="rounded-2xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-300"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}

          {azioneAttiva === "consegna" && (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Consegna vettura</h2>

              {!permessi.can_consegna ? (
                <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
                  Non sei autorizzato alla consegna di vetture.
                </div>
              ) : (
                <>
                  <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-slate-700">
                    Stai per consegnare definitivamente la vettura{" "}
                    <span className="font-semibold">{vettura.targa}</span>.
                  </div>

                  <label className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={confermaConsegna}
                      onChange={(e) => setConfermaConsegna(e.target.checked)}
                    />
                    Confermo la consegna della vettura
                  </label>

                  <div className="mt-4 flex flex-col gap-3 md:flex-row">
                    <button
                      onClick={eseguiConsegna}
                      disabled={!confermaConsegna || processing}
                      className="rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {processing ? "Consegna..." : "Conferma consegna"}
                    </button>

                    <button
                      onClick={() => {
                        setAzioneAttiva(null)
                        setConfermaConsegna(false)
                      }}
                      className="rounded-2xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-300"
                    >
                      Annulla
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {showScrollTop && (
        <button
          onClick={scrollTop}
          aria-label="Torna su"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-xl transition-all duration-200 hover:bg-violet-700 active:scale-95 md:h-12 md:w-auto md:min-w-[124px] md:rounded-2xl md:px-4"
        >
          <span className="text-xl md:hidden">↑</span>
          <span className="hidden text-sm font-semibold md:inline">Torna su</span>
        </button>
      )}
    </div>
  )
}
