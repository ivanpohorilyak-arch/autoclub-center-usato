"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { BrandLogo } from "./brand-logo"
import { SessionTimeout } from "./session-timeout"

export function Topbar() {
  const router = useRouter()
  const pathname = usePathname()

  const isHome = pathname === "/home"

  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch("/api/me", { cache: "no-store" })
        const data = await res.json()

        if (res.ok && data?.ok && data?.ruolo === "admin") {
          setIsAdmin(true)
        }
      } catch {
        // silenzioso
      }
    }

    checkAdmin()
  }, [])

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
      router.refresh()
    } catch {
      router.push("/login")
    }
  }

  return (
    <>
      <SessionTimeout />

      <div className="mb-4 rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
          <BrandLogo compact />

          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:flex">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-2xl bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              Indietro
            </button>

            {!isHome ? (
              <Link
                href="/home"
                className="rounded-2xl bg-blue-600 px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-700"
              >
                Home
              </Link>
            ) : (
              <div className="rounded-2xl bg-slate-100 px-3 py-2.5 text-center text-sm font-semibold text-slate-400">
                Home
              </div>
            )}

            {/* 🔥 NUOVO: SOLO ADMIN */}
            {isAdmin && (
              <Link
                href="/zone"
                className="rounded-2xl bg-indigo-600 px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Zone
              </Link>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-2xl bg-red-500 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
