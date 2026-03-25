"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BrandLogo } from "./brand-logo"
import { SessionTimeout } from "./session-timeout"

export function Topbar() {
  const router = useRouter()
  const pathname = usePathname()

  const isHome = pathname === "/home"

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

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              Indietro
            </button>

            {!isHome ? (
              <Link
                href="/home"
                className="rounded-2xl bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-700"
              >
                Home
              </Link>
            ) : (
              <div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-center text-sm font-semibold text-slate-400">
                Home
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-2xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
