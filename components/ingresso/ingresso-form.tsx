"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"

type Zona = {
  id: string
  nome: string
}

type SavedVehicle = {
  targa: string
  marca: string
  modello: string
  colore: string
  km: number
  numeroChiave: number
  note: string
  zonaId: string
  zonaNome: string
}

function getCookie(name: string) {
  if (typeof document === "undefined") return ""
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(";").shift() || ""
  return ""
}

function normalizzaTarga(value: string) {
  return value.toUpperCase().replace(/\s+/g, "").trim()
}

export function IngressoForm() {
  const scannerZonaId = useMemo(
    () => `scanner-zona-${Math.random().toString(36).slice(2, 9)}`,
    []
  )

  const zonaQrRef = useRef<Html5Qrcode | null>(null)
  const targaInputRef = useRef<HTMLInputElement | null>(null)

  const [scannerZonaAttivo, setScannerZonaAttivo] = useState(false)
  const [scannerZonaMsg, setScannerZonaMsg] = useState(
    "Premi “Attiva scanner zona” per leggere il QR."
  )

  const [zone, setZone] = useState<Zona[]>([])
  const [zoneLoading, setZoneLoading] = useState(true)

  const [targa, setTarga] = useState("")
  const [marca, setMarca] = useState("")
  const [modello, setModello] = useState("")
  const [colore, setColore] = useState("")
  const [km, setKm] = useState("")
  const [numeroChiave, setNumeroChiave] = useState("0")
  const [note, setNote] = useState("")
  const [zonaId, setZonaId] = useState("")
  const [feedback, setFeedback] = useState("")
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false)
  const [savedVehicle, setSavedVehicle] = useState<SavedVehicle | null>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)

  const zonaSelezionata = zone.find((z) => z.id === zonaId)
  const zonaNome = zonaSelezionata?.nome || ""

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
    }
  }

  async function startZonaScanner() {
    try {
      await stopZonaScanner()

      const qr = new Html5Qrcode(scannerZonaId)
      zonaQrRef.current = qr

      setScannerZonaMsg("Scanner zona attivo. Inquadra il QR della zona.")

      await qr.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1,
        },
        async (decodedText) => {
          const value = decodedText.trim().toUpperCase()

          if (!value.startsWith("ZONA|")) {
            setScannerZonaMsg("QR non valido. Serve un QR tipo ZONA|Z01.")
            return
          }

          const code = value.replace("ZONA|", "").trim()
          const zonaValida = zone.find((z) => z.id === code)

          if (!zonaValida) {
            setScannerZonaMsg("Zona non riconosciuta.")
            return
          }

          setZonaId(zonaValida.id)
          setFeedback(`Zona rilevata: ${zonaValida.id} · ${zonaValida.nome}`)
          setScannerZonaMsg("Zona letta correttamente.")

          if (navigator.vibrate) {
            navigator.vibrate(100)
          }

          setScannerZonaAttivo(false)
          await stopZonaScanner()

          setTimeout(() => {
            targaInputRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            })
            targaInputRef.current?.focus()
          }, 250)
        },
        () => {}
      )
    } catch {
      setScannerZonaMsg("Impossibile avviare la camera per lo scanner zona.")
      setScannerZonaAttivo(false)
    }
  }

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

        if (!res.ok) {
          throw new Error(data?.error || "Errore caricamento zone")
        }

        if (active) {
          setZone(Array.isArray(data.zone) ? data.zone : [])
        }
      } catch (err) {
        console.error("LOAD ZONE ERROR:", err)
        if (active) {
          setZone([])
          setFeedback("Errore caricamento zone.")
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

  useEffect(() => {
    if (scannerZonaAttivo) {
      if (zoneLoading) {
        setScannerZonaMsg("Attendere caricamento zone prima di avviare lo scanner.")
        setScannerZonaAttivo(false)
        return
      }

      void startZonaScanner()
    } else {
      void stopZonaScanner()
    }

    return () => {
      void stopZonaScanner()
    }
  }, [scannerZonaAttivo, zoneLoading, zone])

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

  async function handleChiaveLibera() {
    try {
      const res = await fetch("/api/chiave-libera")
      const data = await res.json()

      if (!res.ok) {
        setFeedback(data.error || "Errore ricerca chiave libera")
        return
      }

      setNumeroChiave(String(data.numero ?? 0))
      setFeedback(`Prima chiave libera trovata: ${data.numero}`)
    } catch {
      setFeedback("Errore ricerca chiave libera")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const targaPulita = normalizzaTarga(targa)
    const marcaPulita = marca.trim().toUpperCase()
    const modelloPulito = modello.trim().toUpperCase()
    const colorePulito = colore.trim()
    const kmNumero = km === "" ? 0 : Number(km)
    const chiaveNumero = numeroChiave === "" ? 0 : Number(numeroChiave)

    if (!targaPulita) {
      setFeedback("Inserisci la targa della vettura.")
      return
    }

    if (!/^[A-Z]{2}[0-9]{3}[A-Z]{2}$/.test(targaPulita)) {
      setFeedback("Formato targa non valido. Esempio corretto: AA123BB")
      return
    }

    if (!marcaPulita) {
      setFeedback("Marca obbligatoria.")
      return
    }

    if (!modelloPulito) {
      setFeedback("Modello obbligatorio.")
      return
    }

    if (!colorePulito) {
      setFeedback("Colore obbligatorio.")
      return
    }

    if (!zonaId) {
      setFeedback("Scansione QR zona obbligatoria.")
      return
    }

    if (Number.isNaN(kmNumero) || kmNumero < 0) {
      setFeedback("KM non valido.")
      return
    }

    if (Number.isNaN(chiaveNumero) || chiaveNumero < 0 || chiaveNumero > 520) {
      setFeedback("Numero chiave non valido. Usa 0 oppure un valore da 1 a 520.")
      return
    }

    try {
      setSalvataggioInCorso(true)
      setFeedback("Salvataggio in corso...")

      const operatore = getCookie("autoclub_user") || "Operatore"

      const res = await fetch("/api/ingresso", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targa: targaPulita,
          marca: marcaPulita,
          modello: modelloPulito,
          colore: colorePulito,
          km: kmNumero,
          numeroChiave: chiaveNumero,
          note,
          zonaId,
          operatore,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setFeedback(data.error || "Errore salvataggio")
        return
      }

      setSavedVehicle({
        targa: targaPulita,
        marca: marcaPulita,
        modello: modelloPulito,
        colore: colorePulito,
        km: kmNumero,
        numeroChiave: chiaveNumero,
        note: note.trim(),
        zonaId,
        zonaNome,
      })

      setFeedback("Vettura registrata correttamente.")

      setTarga("")
      setMarca("")
      setModello("")
      setColore("")
      setKm("")
      setNumeroChiave("0")
      setNote("")

      setTimeout(() => {
        targaInputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        })
        targaInputRef.current?.focus()
      }, 250)
    } catch {
      setFeedback("Errore di connessione durante il salvataggio.")
    } finally {
      setSalvataggioInCorso(false)
    }
  }

  function resetForm() {
    setTarga("")
    setMarca("")
    setModello("")
    setColore("")
    setKm("")
    setNumeroChiave("0")
    setNote("")
    setZonaId("")
    setSavedVehicle(null)
    setFeedback("")
    setScannerZonaMsg("Premi “Attiva scanner zona” per leggere il QR.")
    setScannerZonaAttivo(false)
  }

  function nuovaRegistrazioneStessaZona() {
    setSavedVehicle(null)
    setFeedback("")
    setTarga("")
    setMarca("")
    setModello("")
    setColore("")
    setKm("")
    setNumeroChiave("0")
    setNote("")

    setTimeout(() => {
      targaInputRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
      targaInputRef.current?.focus()
    }, 250)
  }

  function scrollTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Scanner QR zona</h2>
            <p className="text-sm text-slate-500">Formato atteso: ZONA|Z01</p>
          </div>

          {!scannerZonaAttivo ? (
            <button
              type="button"
              onClick={() => setScannerZonaAttivo(true)}
              disabled={zoneLoading || zone.length === 0}
              className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
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
            className="min-h-[260px] w-full overflow-hidden rounded-2xl bg-black sm:min-h-[320px]"
          />
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {zoneLoading ? "Caricamento zone..." : scannerZonaMsg}
        </div>

        {!zonaId && !zoneLoading && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Scansione QR zona obbligatoria per abilitare il salvataggio.
          </div>
        )}

        {zonaId && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="text-sm font-semibold text-emerald-700">{zonaId}</div>
            <div className="text-sm text-emerald-800">{zonaNome}</div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {savedVehicle && (
          <div className="rounded-3xl border border-emerald-300 bg-emerald-50 p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-emerald-800">
              Vettura registrata correttamente
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white px-4 py-3">
                <div className="text-xs text-slate-500">Targa</div>
                <div className="font-semibold text-slate-900">{savedVehicle.targa}</div>
              </div>

              <div className="rounded-2xl bg-white px-4 py-3">
                <div className="text-xs text-slate-500">Marca / Modello</div>
                <div className="font-semibold text-slate-900">
                  {savedVehicle.marca} {savedVehicle.modello}
                </div>
              </div>

              <div className="rounded-2xl bg-white px-4 py-3">
                <div className="text-xs text-slate-500">Colore</div>
                <div className="font-semibold text-slate-900">{savedVehicle.colore}</div>
              </div>

              <div className="rounded-2xl bg-white px-4 py-3">
                <div className="text-xs text-slate-500">KM</div>
                <div className="font-semibold text-slate-900">{savedVehicle.km}</div>
              </div>

              <div className="rounded-2xl bg-white px-4 py-3">
                <div className="text-xs text-slate-500">Numero chiave</div>
                <div className="font-semibold text-slate-900">
                  {savedVehicle.numeroChiave === 0
                    ? "0 - Commerciante"
                    : savedVehicle.numeroChiave}
                </div>
              </div>

              <div className="rounded-2xl bg-white px-4 py-3">
                <div className="text-xs text-slate-500">Zona</div>
                <div className="font-semibold text-slate-900">
                  {savedVehicle.zonaId} - {savedVehicle.zonaNome}
                </div>
              </div>

              <div className="rounded-2xl bg-white px-4 py-3 sm:col-span-2">
                <div className="text-xs text-slate-500">Note</div>
                <div className="font-semibold text-slate-900">
                  {savedVehicle.note || "Nessuna nota"}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={nuovaRegistrazioneStessaZona}
                className="rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
              >
                Nuova registrazione stessa zona
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-300"
              >
                Cambia zona / reset completo
              </button>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">Ingresso veicolo</h2>
            <p className="text-sm text-slate-500">Compilazione completa ingresso vettura.</p>
          </div>

          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Inserire con attenzione la targa corretta della vettura prima di salvare.
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Targa</label>
              <input
                ref={targaInputRef}
                type="text"
                value={targa}
                onChange={(e) => setTarga(e.target.value.toUpperCase())}
                placeholder="AA123BB"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-lg outline-none focus:border-indigo-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                Inserimento manuale. In futuro sarà possibile leggere il QR della vettura.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Marca *</label>
              <input
                type="text"
                value={marca}
                onChange={(e) => setMarca(e.target.value.toUpperCase())}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Modello *</label>
              <input
                type="text"
                value={modello}
                onChange={(e) => setModello(e.target.value.toUpperCase())}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Colore *</label>
              <input
                type="text"
                value={colore}
                onChange={(e) => setColore(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">KM</label>
              <input
                type="number"
                inputMode="numeric"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Numero chiave
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="number"
                  inputMode="numeric"
                  value={numeroChiave}
                  onChange={(e) => setNumeroChiave(e.target.value)}
                  placeholder="0 = Commerciante"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                />

                <button
                  type="button"
                  onClick={handleChiaveLibera}
                  className="whitespace-nowrap rounded-2xl bg-amber-500 px-4 py-3 font-semibold text-white hover:bg-amber-600"
                >
                  Chiave libera
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">0 = Commerciante</p>
            </div>

            {zonaId && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Zona</label>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div className="text-sm font-semibold text-emerald-700">{zonaId}</div>
                  <div className="text-sm text-emerald-800">{zonaNome}</div>
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Note</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </div>

            {feedback && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {feedback}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={salvataggioInCorso || !zonaId || zoneLoading}
                className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {salvataggioInCorso ? "Salvataggio..." : "Salva ingresso"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-300"
              >
                Pulisci tutto
              </button>
            </div>
          </div>
        </form>
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
