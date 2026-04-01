"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"

type ZoneId = string

type ZonaApi = {
  id: string
  nome: string
}

type UserInfo = {
  nome: string
  ruolo?: string
  can_consegna?: boolean
  can_modifica_targa?: boolean
}

type Veicolo = {
  targa: string
  marca_modello: string
  colore: string
  km: number
  numero_chiave: number
  zona_id: string
  zona_attuale: string
  stato: string
  note: string
  utente_ultimo_invio?: string
}

type Storico = {
  azione: string
  dettaglio: string
  utente: string
  numero_chiave?: number
  created_at: string
}

function splitMarcaModello(value: string) {
  const parts = (value || "").trim().split(/\s+/)
  return {
    marca: parts[0] || "",
    modello: parts.slice(1).join(" "),
  }
}

export function RicercaVeicolo() {
  const scannerZonaId = useMemo(
    () => `scanner-spostamento-zona-${Math.random().toString(36).slice(2, 9)}`,
    []
  )

  const zonaQrRef = useRef<Html5Qrcode | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const zoneMapRef = useRef<Map<string, string>>(new Map())
  const lastScanRef = useRef<{ value: string; at: number } | null>(null)
  const processingScanRef = useRef(false)

  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [veicolo, setVeicolo] = useState<Veicolo | null>(null)
  const [storico, setStorico] = useState<Storico[]>([])
  const [user, setUser] = useState<UserInfo | null>(null)

  const [showSposta, setShowSposta] = useState(false)
  const [scannerZonaAttivo, setScannerZonaAttivo] = useState(false)
  const [scannerZonaMsg, setScannerZonaMsg] = useState(
    "Per confermare lo spostamento è obbligatoria la scansione del QR della zona di destinazione."
  )
  const [zonesLoaded, setZonesLoaded] = useState(false)
  const [nuovaZonaId, setNuovaZonaId] = useState<ZoneId>("")
  const [nuovaZonaNome, setNuovaZonaNome] = useState("")

  const [showModifica, setShowModifica] = useState(false)
  const [editTarga, setEditTarga] = useState("")
  const [editMarca, setEditMarca] = useState("")
  const [editModello, setEditModello] = useState("")
  const [editColore, setEditColore] = useState("")
  const [editKm, setEditKm] = useState("")
  const [editNumeroChiave, setEditNumeroChiave] = useState("")
  const [editNote, setEditNote] = useState("")

  const [showConsegna, setShowConsegna] = useState(false)

  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch("/api/me", { cache: "no-store" })
        const data = await res.json()
        if (res.ok && data.ok) {
          setUser(data.user)
        }
      } catch {
        //
      }
    }

    void loadMe()
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadZones() {
      try {
        const res = await fetch("/api/zone", {
          method: "GET",
          cache: "no-store",
        })

        const json = await res.json()

        if (!res.ok || !json.ok) {
          throw new Error(json?.error || "Errore caricamento zone")
        }

        const rows: ZonaApi[] = Array.isArray(json.zone) ? json.zone : []
        const map = new Map<string, string>()

        for (const row of rows) {
          const id = String(row.id || "").trim().toUpperCase()
          const nome = String(row.nome || "").trim()
          if (id) {
            map.set(id, nome)
          }
        }

        if (!cancelled) {
          zoneMapRef.current = map
          setZonesLoaded(true)
        }
      } catch {
        if (!cancelled) {
          zoneMapRef.current = new Map()
          setZonesLoaded(false)
        }
      }
    }

    void loadZones()

    return () => {
      cancelled = true
    }
  }, [])

  async function cercaVeicolo(search?: string) {
    const query = (search ?? q).trim().toUpperCase()

    if (!query) {
      setFeedback("Inserisci una targa o un numero chiave.")
      return
    }

    try {
      setLoading(true)
      setFeedback("")
      setVeicolo(null)
      setStorico([])
      setShowSposta(false)
      setShowModifica(false)
      setShowConsegna(false)

      const res = await fetch(`/api/ricerca?q=${encodeURIComponent(query)}`, {
        cache: "no-store",
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setFeedback(data.error || "Nessuna vettura trovata")
        return
      }

      setVeicolo(data.veicolo)
      setStorico(data.storico || [])

      const split = splitMarcaModello(data.veicolo.marca_modello || "")
      setEditTarga(data.veicolo.targa || "")
      setEditMarca(split.marca)
      setEditModello(split.modello)
      setEditColore(data.veicolo.colore || "")
      setEditKm(String(data.veicolo.km ?? 0))
      setEditNumeroChiave(String(data.veicolo.numero_chiave ?? 0))
      setEditNote(data.veicolo.note || "")
    } catch {
      setFeedback("Errore di connessione durante la ricerca.")
    } finally {
      setLoading(false)
    }
  }

  async function stopZonaScanner() {
    try {
      if (zonaQrRef.current) {
        const state = zonaQrRef.current.getState()
        if (state === 2) {
          await zonaQrRef.current.stop()
        }
        await zonaQrRef.current.clear()
      }
    } catch {
      //
    } finally {
      zonaQrRef.current = null
      processingScanRef.current = false
    }
  }

  async function startZonaScanner() {
    try {
      await stopZonaScanner()

      if (!zonesLoaded) {
        setScannerZonaMsg("Zone attive non ancora caricate.")
        setScannerZonaAttivo(false)
        return
      }

      const qr = new Html5Qrcode(scannerZonaId)
      zonaQrRef.current = qr

      setScannerZonaMsg(
        "Scanner attivo. Inquadra il QR della zona di destinazione per abilitare lo spostamento."
      )

      await qr.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1,
        },
        async (decodedText) => {
          const raw = decodedText.trim().toUpperCase()
          const now = Date.now()

          const last = lastScanRef.current
          if (last && last.value === raw && now - last.at < 1500) {
            return
          }
          lastScanRef.current = { value: raw, at: now }

          if (processingScanRef.current) return
          processingScanRef.current = true

          if (!raw.startsWith("ZONA|")) {
            setScannerZonaMsg("QR non valido. Serve un QR tipo ZONA|Z01.")
            processingScanRef.current = false
            return
          }

          const code = raw.replace("ZONA|", "").trim().toUpperCase()

          if (!/^Z\d{2}$/.test(code)) {
            setScannerZonaMsg("Zona non riconosciuta.")
            processingScanRef.current = false
            return
          }

          const zonaNome = zoneMapRef.current.get(code)

          if (!zonaNome) {
            setScannerZonaMsg("Zona non riconosciuta o non attiva.")
            processingScanRef.current = false
            return
          }

          setNuovaZonaId(code)
          setNuovaZonaNome(zonaNome)
          setScannerZonaMsg(`Zona di destinazione letta: ${code} - ${zonaNome}`)

          if (navigator.vibrate) {
            navigator.vibrate(100)
          }

          setScannerZonaAttivo(false)
          await stopZonaScanner()
        },
        () => {}
      )
    } catch {
      setScannerZonaMsg("Impossibile avviare la camera per lo scanner zona.")
      setScannerZonaAttivo(false)
    }
  }

  useEffect(() => {
    if (scannerZonaAttivo) {
      void startZonaScanner()
    } else {
      void stopZonaScanner()
    }

    return () => {
      void stopZonaScanner()
    }
  }, [scannerZonaAttivo, scannerZonaId, zonesLoaded])

  async function confermaSpostamento() {
    if (!veicolo) return

    if (!nuovaZonaId) {
      setFeedback("Spostamento non possibile senza scansione QR della zona.")
      return
    }

    try {
      setFeedback("Spostamento in corso...")

      const res = await fetch("/api/spostamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targa: veicolo.targa,
          zonaId: nuovaZonaId,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setFeedback(data.error || "Errore spostamento")
        return
      }

      setFeedback("Spostamento registrato correttamente.")
      setShowSposta(false)
      setNuovaZonaId("")
      setNuovaZonaNome("")
      await cercaVeicolo(veicolo.targa)
    } catch {
      setFeedback("Errore di connessione durante lo spostamento.")
    }
  }

  async function salvaModifica() {
    if (!veicolo) return

    try {
      setFeedback("Salvataggio modifica in corso...")

      const res = await fetch("/api/veicolo/modifica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targaOriginale: veicolo.targa,
          targaNuova: editTarga.trim().toUpperCase(),
          marca: editMarca,
          modello: editModello,
          colore: editColore,
          km: Number(editKm || 0),
          numeroChiave: Number(editNumeroChiave || 0),
          note: editNote,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setFeedback(data.error || "Errore modifica")
        return
      }

      setFeedback("Vettura modificata correttamente.")
      setShowModifica(false)
      await cercaVeicolo(editTarga.trim().toUpperCase() || veicolo.targa)
    } catch {
      setFeedback("Errore di connessione durante la modifica.")
    }
  }

  async function confermaConsegna() {
    if (!veicolo) return

    try {
      setFeedback("Consegna in corso...")

      const res = await fetch("/api/veicolo/consegna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targa: veicolo.targa,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setFeedback(data.error || "Errore consegna")
        return
      }

      setFeedback("Vettura consegnata correttamente.")
      setShowConsegna(false)
      setVeicolo(null)
      setStorico([])
      setQ("")
      setTimeout(() => searchInputRef.current?.focus(), 200)
    } catch {
      setFeedback("Errore di connessione durante la consegna.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Ricerca</h2>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            ref={searchInputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void cercaVeicolo()
              }
            }}
            placeholder="Targa o numero chiave"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-lg outline-none focus:border-indigo-500"
          />

          <button
            type="button"
            onClick={() => void cercaVeicolo()}
            className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            {loading ? "Ricerca..." : "Cerca"}
          </button>
        </div>

        {feedback && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {feedback}
          </div>
        )}
      </div>

      {veicolo && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Scheda vettura</h2>
                <p className="text-sm text-slate-500">Dati attuali e posizione della vettura.</p>
              </div>

              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {veicolo.stato}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="text-xs text-slate-500">Targa</div>
                <div className="font-semibold text-slate-900">{veicolo.targa}</div>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="text-xs text-slate-500">Marca / Modello</div>
                <div className="font-semibold text-slate-900">{veicolo.marca_modello}</div>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="text-xs text-slate-500">Colore</div>
                <div className="font-semibold text-slate-900">{veicolo.colore}</div>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="text-xs text-slate-500">KM</div>
                <div className="font-semibold text-slate-900">{veicolo.km}</div>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="text-xs text-slate-500">Numero chiave</div>
                <div className="font-semibold text-slate-900">
                  {veicolo.numero_chiave === 0 ? "0 - Commerciante" : veicolo.numero_chiave}
                </div>
              </div>

              <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                <div className="text-xs text-emerald-700">Posizione attuale</div>
                <div className="font-semibold text-emerald-900">
                  {veicolo.zona_id} - {veicolo.zona_attuale}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3 lg:col-span-3">
                <div className="text-xs text-slate-500">Note</div>
                <div className="font-semibold text-slate-900">{veicolo.note || "Nessuna nota"}</div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  setShowSposta((v) => !v)
                  setShowModifica(false)
                  setShowConsegna(false)
                  setNuovaZonaId("")
                  setNuovaZonaNome("")
                  setScannerZonaMsg(
                    "Per confermare lo spostamento è obbligatoria la scansione del QR della zona di destinazione."
                  )
                }}
                className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Sposta
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowModifica((v) => !v)
                  setShowSposta(false)
                  setShowConsegna(false)
                }}
                className="rounded-2xl bg-amber-500 px-5 py-3 font-semibold text-white hover:bg-amber-600"
              >
                Modifica
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowConsegna((v) => !v)
                  setShowSposta(false)
                  setShowModifica(false)
                }}
                className="rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
              >
                Consegna
              </button>
            </div>
          </div>

          {showSposta && (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-slate-900">Spostamento vettura</h3>

              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Spostamento consentito solo dopo scansione del QR della zona di destinazione.
              </div>

              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm text-slate-500">Vettura</div>
                  <div className="font-semibold text-slate-900">{veicolo.targa}</div>
                </div>

                {!scannerZonaAttivo ? (
                  <button
                    type="button"
                    onClick={() => setScannerZonaAttivo(true)}
                    className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Attiva scanner zona
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setScannerZonaAttivo(false)}
                    className="rounded-2xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300"
                  >
                    Ferma
                  </button>
                )}
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-black p-3">
                <div
                  id={scannerZonaId}
                  className="min-h-[260px] w-full overflow-hidden rounded-2xl bg-black"
                />
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {scannerZonaMsg}
              </div>

              {nuovaZonaId && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div className="text-sm font-semibold text-emerald-700">
                    Nuova zona: {nuovaZonaId}
                  </div>
                  <div className="text-sm text-emerald-800">{nuovaZonaNome}</div>
                </div>
              )}

              {nuovaZonaId && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-sm text-slate-500">Conferma spostamento</div>
                  <div className="mt-2 text-sm text-slate-800">
                    <strong>{veicolo.targa}</strong> verrà spostata da{" "}
                    <strong>{veicolo.zona_attuale}</strong> a{" "}
                    <strong>{nuovaZonaNome}</strong>.
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => void confermaSpostamento()}
                      className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                    >
                      Conferma spostamento
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNuovaZonaId("")
                        setNuovaZonaNome("")
                        setShowSposta(false)
                      }}
                      className="rounded-2xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-300"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {showModifica && (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-slate-900">Modifica vettura</h3>

              {!user?.can_modifica_targa && (
                <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  La targa non è modificabile con il tuo profilo.
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Targa</label>
                  <input
                    type="text"
                    value={editTarga}
                    onChange={(e) => setEditTarga(e.target.value.toUpperCase())}
                    disabled={!user?.can_modifica_targa}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Marca *</label>
                  <input
                    type="text"
                    value={editMarca}
                    onChange={(e) => setEditMarca(e.target.value.toUpperCase())}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Modello *</label>
                  <input
                    type="text"
                    value={editModello}
                    onChange={(e) => setEditModello(e.target.value.toUpperCase())}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Colore *</label>
                  <input
                    type="text"
                    value={editColore}
                    onChange={(e) => setEditColore(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">KM</label>
                  <input
                    type="number"
                    value={editKm}
                    onChange={(e) => setEditKm(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Numero chiave</label>
                  <input
                    type="number"
                    value={editNumeroChiave}
                    onChange={(e) => setEditNumeroChiave(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Note</label>
                  <textarea
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void salvaModifica()}
                  className="rounded-2xl bg-amber-500 px-5 py-3 font-semibold text-white hover:bg-amber-600"
                >
                  Salva modifiche
                </button>

                <button
                  type="button"
                  onClick={() => setShowModifica(false)}
                  className="rounded-2xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-300"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}

          {showConsegna && (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-slate-900">Consegna vettura</h3>

              {!user?.can_consegna ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                  Operazione non consentita. Il tuo profilo non è abilitato alla consegna veicoli.
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                  Confermi di voler consegnare la vettura <strong>{veicolo.targa}</strong>?
                </div>
              )}

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                {user?.can_consegna && (
                  <button
                    type="button"
                    onClick={() => void confermaConsegna()}
                    className="rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
                  >
                    Conferma consegna
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowConsegna(false)}
                  className="rounded-2xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-300"
                >
                  Chiudi
                </button>
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Storico movimenti</h3>

            {storico.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Nessuno storico disponibile.
              </div>
            ) : (
              <div className="space-y-3">
                {storico.map((item, index) => (
                  <div
                    key={`${item.created_at}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="text-sm font-semibold text-slate-900">{item.azione}</div>
                    <div className="text-sm text-slate-700">{item.dettaglio}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.utente} · {new Date(item.created_at).toLocaleString("it-IT")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
