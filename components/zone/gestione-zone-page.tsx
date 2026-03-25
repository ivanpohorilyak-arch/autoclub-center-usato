"use client"

import { useEffect, useState } from "react"

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

  const [newId, setNewId] = useState("")
  const [newNome, setNewNome] = useState("")

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

  useEffect(() => {
    void caricaZone()
  }, [])

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

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Gestione zone</h1>
        <p className="mt-1 text-sm text-slate-500">
          Aggiungi zone, attiva o disattiva, cambia ordine senza toccare GitHub.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="mb-4 text-lg font-bold text-slate-900">Nuova zona</h2>

        <div className="grid gap-4 md:grid-cols-[180px_1fr_auto]">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Codice</label>
            <input
              type="text"
              value={newId}
              onChange={(e) => setNewId(e.target.value.toUpperCase())}
              placeholder="Z15"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nome zona</label>
            <input
              type="text"
              value={newNome}
              onChange={(e) => setNewNome(e.target.value)}
              placeholder="Nuova zona"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Salvataggio..." : "Aggiungi"}
            </button>
          </div>
        </div>
      </form>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">Elenco zone</h2>

          <button
            type="button"
            onClick={() => void caricaZone()}
            disabled={loading || saving}
            className="rounded-2xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 disabled:opacity-60"
          >
            Aggiorna
          </button>
        </div>

        {feedback && (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {feedback}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Caricamento zone...
          </div>
        ) : zone.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Nessuna zona trovata.
          </div>
        ) : (
          <div className="space-y-3">
            {zone.map((z, index) => (
              <div
                key={z.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {z.id} - {z.nome}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Ordine: {z.ordine} · Stato: {z.attiva ? "Attiva" : "Disattivata"}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving || index === 0}
                    onClick={() => void moveZona(z.id, "up")}
                    className="rounded-2xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 disabled:opacity-60"
                  >
                    Su
                  </button>

                  <button
                    type="button"
                    disabled={saving || index === zone.length - 1}
                    onClick={() => void moveZona(z.id, "down")}
                    className="rounded-2xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 disabled:opacity-60"
                  >
                    Giù
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void toggleZona(z.id, z.attiva)}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
                      z.attiva
                        ? "bg-rose-600 hover:bg-rose-700"
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
    </div>
  )
}
