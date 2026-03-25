"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { BrandLogo } from "../layout/brand-logo"

type Operatore = {
  nome: string
}

export function LoginForm() {
  const router = useRouter()

  const [operatori, setOperatori] = useState<Operatore[]>([])
  const [filtroOperatore, setFiltroOperatore] = useState("")
  const [operatore, setOperatore] = useState("")
  const [pin, setPin] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingOperatori, setLoadingOperatori] = useState(true)
  const [errore, setErrore] = useState("")
  const [showCredit, setShowCredit] = useState(false)

  const operatoriFiltrati = useMemo(() => {
    const filtro = filtroOperatore.trim().toLowerCase()

    if (!filtro) return operatori

    return operatori.filter((item) =>
      item.nome.toLowerCase().includes(filtro)
    )
  }, [operatori, filtroOperatore])

  const maskedPin = useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => (pin[i] ? "•" : "–")).join(" ")
  }, [pin])

  useEffect(() => {
    async function loadOperatori() {
      try {
        setLoadingOperatori(true)
        setErrore("")

        const res = await fetch("/api/utenti-attivi", {
          method: "GET",
          cache: "no-store",
        })

        const data = await res.json()

        const users = Array.isArray(data?.utenti)
          ? data.utenti
          : Array.isArray(data?.users)
          ? data.users
          : []

        if (!res.ok) {
          setErrore(data?.error || "Impossibile caricare gli operatori.")
          return
        }

        if (!users.length) {
          setErrore("Nessun operatore attivo trovato.")
          setOperatori([])
          return
        }

        const puliti = users
          .filter((item: unknown) => {
            return typeof item === "object" && item !== null && "nome" in item
          })
          .map((item: { nome: string }) => ({
            nome: item.nome,
          }))

        setOperatori(puliti)
      } catch {
        setErrore("Impossibile caricare gli operatori.")
      } finally {
        setLoadingOperatori(false)
      }
    }

    void loadOperatori()
  }, [])

  useEffect(() => {
    if (operatoriFiltrati.length === 1 && filtroOperatore.trim()) {
      setOperatore(operatoriFiltrati[0].nome)
    }
  }, [operatoriFiltrati, filtroOperatore])

  useEffect(() => {
    const t = setTimeout(() => setShowCredit(true), 3000)
    return () => clearTimeout(t)
  }, [])

  async function handleSubmit(customPin?: string) {
    const finalPin = customPin ?? pin

    if (!operatore) {
      setErrore("Seleziona un operatore.")
      return
    }

    if (finalPin.length !== 4) {
      setErrore("Inserisci un PIN di 4 cifre.")
      return
    }

    try {
      setLoading(true)
      setErrore("")

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome: operatore,
          pin: finalPin,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        setErrore(data?.error || "Credenziali non valide.")
        setPin("")
        return
      }

      router.push("/home")
      router.refresh()
    } catch {
      setErrore("Errore di connessione durante il login.")
      setPin("")
    } finally {
      setLoading(false)
    }
  }

  function handleDigitClick(digit: string) {
    if (loading) return

    if (!operatore) {
      setErrore("Seleziona prima un operatore.")
      return
    }

    if (pin.length >= 4) return

    const nextPin = `${pin}${digit}`
    setPin(nextPin)
    setErrore("")

    if (nextPin.length === 4) {
      void handleSubmit(nextPin)
    }
  }

  function handleClear() {
    if (loading) return
    setPin("")
    setErrore("")
  }

  function handleBackspace() {
    if (loading) return
    setPin((prev) => prev.slice(0, -1))
    setErrore("")
  }

  return (
    <div className="w-full">
      <div className="mb-3">
        <BrandLogo />
        <p className="mt-1 text-sm text-slate-500">Accesso operatori</p>
      </div>

      <div className="space-y-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Cerca operatore
          </label>

          <input
            type="text"
            value={filtroOperatore}
            onChange={(e) => {
              setFiltroOperatore(e.target.value)
              setErrore("")
              setPin("")
            }}
            placeholder="🔎 Cerca operatore..."
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Operatore
          </label>

          <select
            value={operatore}
            onChange={(e) => {
              setOperatore(e.target.value)
              setPin("")
              setErrore("")
            }}
            disabled={loading || loadingOperatori}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 outline-none focus:border-indigo-500 disabled:bg-slate-100"
          >
            <option value="">
              {loadingOperatori
                ? "Caricamento operatori..."
                : operatoriFiltrati.length === 0
                ? "Nessun operatore trovato"
                : "Seleziona operatore"}
            </option>

            {operatoriFiltrati.map((item) => (
              <option key={item.nome} value={item.nome}>
                {item.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
          <div className="text-2xl font-bold tracking-[0.28em] text-slate-600 sm:text-3xl">
            {maskedPin}
          </div>
        </div>

        {errore && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errore}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitClick(digit)}
              disabled={loading}
              className="h-12 rounded-2xl bg-slate-100 text-lg font-bold text-slate-800 shadow-sm transition hover:bg-slate-200 disabled:opacity-60 sm:h-11 sm:text-base"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            className="h-12 rounded-2xl bg-red-500 text-lg font-bold text-white shadow-sm transition hover:bg-red-600 disabled:opacity-60 sm:h-11 sm:text-base"
          >
            C
          </button>

          <button
            type="button"
            onClick={() => handleDigitClick("0")}
            disabled={loading}
            className="h-12 rounded-2xl bg-slate-100 text-lg font-bold text-slate-800 shadow-sm transition hover:bg-slate-200 disabled:opacity-60 sm:h-11 sm:text-base"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            disabled={loading}
            className="h-12 rounded-2xl bg-slate-200 text-lg font-bold text-slate-700 shadow-sm transition hover:bg-slate-300 disabled:opacity-60 sm:h-11 sm:text-base"
          >
            ←
          </button>
        </div>

        {loading && (
          <div className="pt-1 text-center text-sm text-slate-500">
            Accesso in corso...
          </div>
        )}

        <div
          className={`mt-3 flex justify-center transition-all duration-700 ${
            showCredit ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          <div className="rounded-xl bg-gradient-to-r from-slate-100/70 to-slate-200/50 px-3 py-1.5 text-[11px] text-slate-500 shadow-sm backdrop-blur-sm">
            Autoclub Center 2.1 · Creato da Ivan · con supporto ChatGPT &amp; SL
          </div>
        </div>
      </div>
    </div>
  )
}
