"use client"

import { useEffect, useMemo, useState } from "react"
import { Topbar } from "../../../components/layout/topbar"

type MeUser = {
  id: number
  nome: string
  ruolo: string
  attivo: boolean
  can_consegna: boolean
  can_modifica_targa: boolean
}

type UserRecord = {
  id: number
  nome: string
  ruolo: string
  attivo: boolean
  can_consegna: boolean
  can_modifica_targa: boolean
}

const EMPTY_FORM = {
  nome: "",
  pin: "",
  ruolo: "operatore",
  attivo: true,
  can_consegna: false,
  can_modifica_targa: false,
}

export default function GestioneUtentiPage() {
  const [me, setMe] = useState<MeUser | null>(null)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editPin, setEditPin] = useState("")

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    setError("")
    setMessage("")

    try {
      const [meRes, usersRes] = await Promise.all([
        fetch("/api/me", { cache: "no-store" }),
        fetch("/api/gestione-utenti", { cache: "no-store" }),
      ])

      const meData = await meRes.json()
      const usersData = await usersRes.json()

      if (meData?.ok && meData?.user) {
        setMe(meData.user)
      } else {
        setMe(null)
      }

      if (!usersRes.ok || !usersData?.ok) {
        setError(usersData?.error || "Errore caricamento utenti.")
        setUsers([])
        return
      }

      setUsers(usersData.records || [])
    } catch {
      setError("Errore di connessione.")
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = (me?.ruolo || "").toLowerCase() === "admin"

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedId) || null,
    [users, selectedId]
  )

  async function createUser() {
    setSaving(true)
    setError("")
    setMessage("")

    try {
      const res = await fetch("/api/gestione-utenti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Errore creazione utente.")
        return
      }

      setMessage("Utente creato correttamente.")
      setForm(EMPTY_FORM)
      await loadAll()
    } catch {
      setError("Errore di connessione in creazione.")
    } finally {
      setSaving(false)
    }
  }

  async function updateUser() {
    if (!selectedUser) {
      setError("Seleziona un utente.")
      return
    }

    setSaving(true)
    setError("")
    setMessage("")

    try {
      const res = await fetch("/api/gestione-utenti", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedUser.id,
          ruolo: selectedUser.ruolo,
          attivo: selectedUser.attivo,
          can_consegna: selectedUser.can_consegna,
          can_modifica_targa: selectedUser.can_modifica_targa,
          pin: editPin,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Errore modifica utente.")
        return
      }

      setMessage("Utente aggiornato correttamente.")
      setEditPin("")
      await loadAll()
    } catch {
      setError("Errore di connessione in modifica.")
    } finally {
      setSaving(false)
    }
  }

  async function deleteUser() {
    if (!selectedUser) {
      setError("Seleziona un utente.")
      return
    }

    const conferma = window.confirm(
      `Confermi l'eliminazione dell'utente ${selectedUser.nome}?`
    )
    if (!conferma) return

    setSaving(true)
    setError("")
    setMessage("")

    try {
      const res = await fetch(
        `/api/gestione-utenti?id=${selectedUser.id}`,
        {
          method: "DELETE",
        }
      )

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Errore eliminazione utente.")
        return
      }

      setMessage("Utente eliminato correttamente.")
      setSelectedId(null)
      setEditPin("")
      await loadAll()
    } catch {
      setError("Errore di connessione in eliminazione.")
    } finally {
      setSaving(false)
    }
  }

  function updateSelected<K extends keyof UserRecord>(
    key: K,
    value: UserRecord[K]
  ) {
    if (!selectedUser) return
    setUsers((prev) =>
      prev.map((u) => (u.id === selectedUser.id ? { ...u, [key]: value } : u))
    )
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <Topbar />

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm text-slate-500">
          Caricamento...
        </div>
      ) : !isAdmin ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-red-700">Accesso non consentito</h1>
          <p className="mt-2 text-sm text-red-600">
            Questa sezione è disponibile solo per utenti con ruolo admin.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900">Gestione Utenti</h1>
            <p className="mt-1 text-sm text-slate-500">
              Gestione completa operatori, ruoli e permessi.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Crea nuovo utente</h2>

              <div className="mt-4 grid gap-3">
                <input
                  value={form.nome}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, nome: e.target.value }))
                  }
                  placeholder="Nome e cognome"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-indigo-500"
                />

                <input
                  value={form.pin}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      pin: e.target.value.replace(/\D/g, "").slice(0, 4),
                    }))
                  }
                  placeholder="PIN 4 cifre"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-indigo-500"
                />

                <select
                  value={form.ruolo}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, ruolo: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-indigo-500"
                >
                  <option value="operatore">Operatore</option>
                  <option value="admin">Admin</option>
                </select>

                <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.attivo}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, attivo: e.target.checked }))
                    }
                  />
                  Utente attivo
                </label>

                <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.can_consegna}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        can_consegna: e.target.checked,
                      }))
                    }
                  />
                  Abilitato alla consegna
                </label>

                <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.can_modifica_targa}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        can_modifica_targa: e.target.checked,
                      }))
                    }
                  />
                  Abilitato modifica targa
                </label>

                <button
                  type="button"
                  onClick={createUser}
                  disabled={saving}
                  className="rounded-2xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"
                >
                  {saving ? "Salvataggio..." : "Crea utente"}
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Modifica utenti</h2>

              <div className="mt-4 grid gap-3">
                <select
                  value={selectedId ?? ""}
                  onChange={(e) =>
                    setSelectedId(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-indigo-500"
                >
                  <option value="">Seleziona utente</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))}
                </select>

                {selectedUser && (
                  <>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <b>Utente:</b> {selectedUser.nome}
                    </div>

                    <select
                      value={selectedUser.ruolo}
                      onChange={(e) => updateSelected("ruolo", e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-indigo-500"
                    >
                      <option value="operatore">Operatore</option>
                      <option value="admin">Admin</option>
                    </select>

                    <input
                      value={editPin}
                      onChange={(e) =>
                        setEditPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      placeholder="Nuovo PIN 4 cifre (opzionale)"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-indigo-500"
                    />

                    <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedUser.attivo}
                        onChange={(e) =>
                          updateSelected("attivo", e.target.checked)
                        }
                      />
                      Utente attivo
                    </label>

                    <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedUser.can_consegna}
                        onChange={(e) =>
                          updateSelected("can_consegna", e.target.checked)
                        }
                      />
                      Abilitato alla consegna
                    </label>

                    <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedUser.can_modifica_targa}
                        onChange={(e) =>
                          updateSelected(
                            "can_modifica_targa",
                            e.target.checked
                          )
                        }
                      />
                      Abilitato modifica targa
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={updateUser}
                        disabled={saving}
                        className="rounded-2xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"
                      >
                        {saving ? "Salvataggio..." : "Salva modifiche"}
                      </button>

                      <button
                        type="button"
                        onClick={deleteUser}
                        disabled={saving}
                        className="rounded-2xl bg-red-500 px-5 py-3 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
                      >
                        Elimina utente
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-slate-900">Elenco utenti</h2>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-left text-slate-700">
                  <tr>
                    <th className="px-3 py-3">Nome</th>
                    <th className="px-3 py-3">Ruolo</th>
                    <th className="px-3 py-3">Attivo</th>
                    <th className="px-3 py-3">Consegna</th>
                    <th className="px-3 py-3">Modifica targa</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-slate-100">
                      <td className="px-3 py-3 font-medium text-slate-900">
                        {u.nome}
                      </td>
                      <td className="px-3 py-3">{u.ruolo}</td>
                      <td className="px-3 py-3">
                        {u.attivo ? "Sì" : "No"}
                      </td>
                      <td className="px-3 py-3">
                        {u.can_consegna ? "Sì" : "No"}
                      </td>
                      <td className="px-3 py-3">
                        {u.can_modifica_targa ? "Sì" : "No"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="text-lg font-bold text-slate-900">{u.nome}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-slate-500">Ruolo:</span>{" "}
                      <span className="font-medium text-slate-900">{u.ruolo}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Attivo:</span>{" "}
                      <span className="font-medium text-slate-900">
                        {u.attivo ? "Sì" : "No"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Consegna:</span>{" "}
                      <span className="font-medium text-slate-900">
                        {u.can_consegna ? "Sì" : "No"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Modifica targa:</span>{" "}
                      <span className="font-medium text-slate-900">
                        {u.can_modifica_targa ? "Sì" : "No"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
