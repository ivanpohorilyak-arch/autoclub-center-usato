"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

const INACTIVITY_LIMIT = 20 * 60 * 1000

export function SessionTimeout() {
  const router = useRouter()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLoggingOutRef = useRef(false)

  useEffect(() => {
    async function doLogout() {
      if (isLoggingOutRef.current) return
      isLoggingOutRef.current = true

      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          cache: "no-store",
        })
      } catch {
        // niente
      } finally {
        router.push("/login")
        router.refresh()
      }
    }

    function resetTimer() {
      if (isLoggingOutRef.current) return

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        void doLogout()
      }, INACTIVITY_LIMIT)
    }

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "touchmove",
      "scroll",
      "click",
    ]

    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true })
    })

    resetTimer()

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      events.forEach((event) => {
        window.removeEventListener(event, resetTimer)
      })
    }
  }, [router])

  return null
}
