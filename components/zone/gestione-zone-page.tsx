"use client"

import { useEffect, useState } from "react"
import { Topbar } from "../layout/topbar"

type Zona = {
  id: string
  nome: string
  attiva: boolean
  ordine: number
  created_at?: string
}

export function GestioneZonePage() {
  const [zone, setZone] = useState<Zona[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [showScrollTop, setShowScrollTop] = useState(false)

  const [newId, setNewId] = useState("")
  const [newNome, setNewNome] = useState("")

  useEffect(() => {
    void caricaZone()
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

  async function caricaZone() {
    try {
      setLoading(true)
      setFeedback("")

      const res = await fetch("/api/admin/zone", {
        cache: "no-store",
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setFeedback(data.error || "Errore caricamento zone")
        return
      }

      setZone(Array.isArray(data.zone) ? data.zone : [])
    } catch {
      setFeedback("Errore di connessione durante il caricamento zone")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()

    const id = newId.trim().toUpperCase()
    const nome = newNome.trim()

    if (!id || !nome) {
      setFeedback("Inserisci codice e nome zona")
      return
    }

    try {
      setSaving(true)
      setFeedback("Salvataggio in corso...")

      const res = await fetch("/api/admin/zone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          nome,
          attiva: true,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setFeedback(data.error || "Errore creazione zona")
        return
      }

      setNewId("")
      setNewNome("")
      setFeedback("Zona creata correttamente")
      await caricaZone()
    } catch {
      setFeedback("Errore di connessione durante la creazione zona")
    } finally {
      setSaving(false)
    }
  }

  async function toggleZona(id: string, attiva: boolean) {
    try {
      setSaving(true)
      setFeedback("Aggiornamento in corso...")

      const res = await fetch("/api/admin/zone", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          attiva: !attiva,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setFeedback(data.error || "Errore aggiornamento zona")
        return
      }

      setFeedback("Zona aggiornata correttamente")
      await caricaZone()
    } catch {
      setFeedback("Errore di connessione durante aggiornamento zona")
    } finally {
      setSaving(false)
    }
  }

  async function moveZona(id: string, direction: "up" | "down") {
    try {
      setSaving(true)
      setFeedback("Riordino in corso...")

      const res = await fetch("/api/admin/zone/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          direction,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setFeedback(data.error || "Errore riordino zona")
        return
      }

      setFeedback("Ordine aggiornato correttamente")
      await caricaZone()
    } catch {
      setFeedback("Errore di connessione durante riordino zona")
    } finally {
      setSaving(false)
    }
  }

  function scrollTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <Topbar />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Gestione zone</h1>
        <p className="mt-1 text-sm text-slate-500">
          Aggiungi zone, attiva o disattiva, cambia ordine senza toccare GitHub.
        </p>
      </div>

      {feedback && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {feedback}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="mb-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="mb-4 text-xl font-bold text-slate-900">Nuova zona</h2>

        <div className="grid gap-3 lg:grid-cols-[160px_1fr_auto]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Codice
            </label>
            <input
              type="text"
              value={newId}
              onChange={(e) => setNewId(e.target.value.toUpperCase())}
              placeholder="Z15"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Nome zona
            </label>
            <input
              type="text"
              value={newNome}
              onChange={(e) => setNewNome(e.target.value)}
              placeholder="Nuova zona"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Salvataggio..." : "Aggiungi"}
            </button>
          </div>
        </div>
      </form>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-slate-900">Elenco zone</h2>

          <button
            type="button"
            onClick={() => void caricaZone()}
            disabled={loading || saving}
            className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
          >
            Aggiorna
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-500">
            Caricamento zone...
          </div>
        ) : zone.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-500">
            Nessuna zona trovata.
          </div>
        ) : (
          <div className="space-y-3">
            {zone.map((z, index) => (
              <div
                key={z.id}
                className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-lg font-bold text-slate-900">
                    {z.id} - {z.nome}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Ordine: {z.ordine} · Stato: {z.attiva ? "Attiva" : "Disattivata"}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving || index === 0}
                    onClick={() => void moveZona(z.id, "up")}
                    className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                  >
                    Su
                  </button>

                  <button
                    type="button"
                    disabled={saving || index === zone.length - 1}
                    onClick={() => void moveZona(z.id, "down")}
                    className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                  >
                    Giù
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void toggleZona(z.id, z.attiva)}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
                      z.attiva
                        ? "bg-pink-500 hover:bg-pink-600"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {z.attiva ? "Disattiva" : "Attiva"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showScrollTop && (
        <button
          onClick={scrollTop}
          aria-label="Torna su"
          className="fixed right-5 bottom-24 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-xl transition-all duration-200 hover:bg-violet-700 active:scale-95 md:bottom-5 md:h-12 md:w-auto md:min-w-[124px] md:rounded-2xl md:px-4"
        >
          <span className="text-xl md:hidden">↑</span>
          <span className="hidden text-sm font-semibold md:inline">Torna su</span>
        </button>
      )}
    </div>
  )
}
