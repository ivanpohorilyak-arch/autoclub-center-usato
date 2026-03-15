"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { ZONE_INFO, type ZoneId } from "@/lib/zones"

type ScanResult = {
  zonaId: ZoneId
  zonaNome: string
  rawValue: string
}

type QrZoneScannerProps = {
  onDetected: (result: ScanResult) => void
  isActive?: boolean
  scannerId?: string
  className?: string
}

function parseZonaQr(value: string): ScanResult | null {
  const raw = String(value || "").trim()

  if (!raw) return null

  let zonaId = raw as ZoneId

  if (raw.startsWith("ZONA|")) {
    zonaId = raw.replace("ZONA|", "").trim() as ZoneId
  }

  if (!Object.prototype.hasOwnProperty.call(ZONE_INFO, zonaId)) {
    return null
  }

  return {
    zonaId,
    zonaNome: ZONE_INFO[zonaId].nome,
    rawValue: raw,
  }
}

export function QrZoneScanner({
  onDetected,
  isActive = true,
  scannerId = "qr-zone-scanner",
  className = "",
}: QrZoneScannerProps) {
  const qrRef = useRef<Html5Qrcode | null>(null)
  const startedRef = useRef(false)
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
            const parsed = parseZonaQr(decodedText)

            if (!parsed) return

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
            }
          },
          () => {
          }
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
      startScanner()
    } else {
      stopScanner()
    }

    return () => {
      cancelled = true
      stopScanner()
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
