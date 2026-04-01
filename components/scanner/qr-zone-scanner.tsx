"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"

type ScanResult = {
  zonaId: string
  zonaNome: string
  rawValue: string
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
    const zonaId = raw.replace("ZONA|", "").trim()
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

  const [error, setError] = useState("")
  const [isStarting, setIsStarting] = useState(false)

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

    async function resolveZona(zonaId: string): Promise<ScanResult | null> {
      try {
        const res = await fetch("/api/zone", {
          method: "GET",
          cache: "no-store",
        })

        const json = await res.json()

        if (!res.ok || !json.ok) return null

        const rows = Array.isArray(json.zone) ? json.zone : []
        const zona = rows.find((z: { id: string; nome: string }) => z.id === zonaId)

        if (!zona) return null

        return {
          zonaId: zona.id,
          zonaNome: zona.nome,
          rawValue: `ZONA|${zona.id}`,
        }
      } catch {
        return null
      }
    }

    async function startScanner() {
      if (!isActive) return
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
            if (processingRef.current) return
            processingRef.current = true

            const zonaId = extractZonaId(decodedText)

            if (!zonaId) {
              processingRef.current = false
              return
            }

            const parsed = await resolveZona(zonaId)

            if (!parsed) {
              setError(`Zona ${zonaId} non valida o non attiva.`)
              processingRef.current = false
              return
            }

            onDetected(parsed)

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

    if (isActive) {
      void startScanner()
    } else {
      void stopScanner()
    }

    return () => {
      cancelled = true
      void stopScanner()
    }
  }, [isActive, onDetected, scannerId])

  return (
    <div className={className}>
      <div
        id={scannerId}
        className="overflow-hidden rounded-3xl border border-slate-200 bg-black"
      />

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
