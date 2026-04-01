"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"

type ScanResult = {
  zonaId: string
  zonaNome: string
  rawValue: string
}

type ZonaApi = {
  id: string
  nome: string
}

type QrZoneScannerProps = {
  onDetected: (result: ScanResult) => void
  isActive?: boolean
  scannerId?: string
  className?: string
}

function extractZonaId(value: string): string | null {
  const raw = String(value || "").trim().toUpperCase()

  if (!raw) return null

  if (raw.startsWith("ZONA|")) {
    const zonaId = raw.replace("ZONA|", "").trim().toUpperCase()
    return zonaId || null
  }

  return raw || null
}

export function QrZoneScanner({
  onDetected,
  isActive = true,
  scannerId = "qr-zone-scanner",
  className = "",
}: QrZoneScannerProps) {
  const qrRef = useRef<Html5Qrcode | null>(null)
  const startedRef = useRef(false)
  const processingRef = useRef(false)
  const lastScanRef = useRef<{ value: string; at: number } | null>(null)
  const zoneMapRef = useRef<Map<string, string>>(new Map())

  const [error, setError] = useState("")
  const [isStarting, setIsStarting] = useState(false)
  const [zonesLoaded, setZonesLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadZones() {
      try {
        setError("")
        setZonesLoaded(false)

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
          setError("Impossibile caricare le zone attive.")
          setZonesLoaded(false)
        }
      }
    }

    void loadZones()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function stopScanner() {
      try {
        if (qrRef.current && startedRef.current) {
          await qrRef.current.stop()
          await qrRef.current.clear()
        }
      } catch {
      } finally {
        startedRef.current = false
        qrRef.current = null
        processingRef.current = false
      }
    }

    async function startScanner() {
      if (!isActive) return
      if (!zonesLoaded) return
      if (startedRef.current) return

      try {
        setError("")
        setIsStarting(true)

        const qr = new Html5Qrcode(scannerId)
        qrRef.current = qr

        await qr.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1,
          },
          async (decodedText) => {
            const now = Date.now()
            const raw = String(decodedText || "").trim()

            if (!raw) return

            const last = lastScanRef.current
            if (last && last.value === raw && now - last.at < 1500) {
              return
            }
            lastScanRef.current = { value: raw, at: now }

            if (processingRef.current) return
            processingRef.current = true

            const zonaId = extractZonaId(raw)

            if (!zonaId) {
              processingRef.current = false
              return
            }

            if (!/^Z\d{2}$/.test(zonaId)) {
              setError("QR zona non valido.")
              processingRef.current = false
              return
            }

            const zonaNome = zoneMapRef.current.get(zonaId)

            if (!zonaNome) {
              setError(`Zona ${zonaId} non valida o non attiva.`)
              processingRef.current = false
              return
            }

            onDetected({
              zonaId,
              zonaNome,
              rawValue: raw,
            })

            if (navigator.vibrate) {
              navigator.vibrate(100)
            }

            try {
              if (qrRef.current && startedRef.current) {
                await qrRef.current.stop()
                await qrRef.current.clear()
              }
            } catch {
            } finally {
              startedRef.current = false
              qrRef.current = null
              processingRef.current = false
            }
          },
          () => {}
        )

        if (!cancelled) {
          startedRef.current = true
        }
      } catch {
        if (!cancelled) {
          setError("Impossibile avviare lo scanner QR.")
        }
      } finally {
        if (!cancelled) {
          setIsStarting(false)
        }
      }
    }

    if (isActive && zonesLoaded) {
      void startScanner()
    } else {
      void stopScanner()
    }

    return () => {
      cancelled = true
      void stopScanner()
    }
  }, [isActive, zonesLoaded, onDetected, scannerId])

  return (
    <div className={className}>
      <div
        id={scannerId}
        className="overflow-hidden rounded-3xl border border-slate-200 bg-black"
      />

      {!zonesLoaded && !error && (
        <div className="mt-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
          Caricamento zone attive...
        </div>
      )}

      {isStarting && (
        <div className="mt-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
          Avvio scanner in corso...
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}
