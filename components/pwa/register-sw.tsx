"use client"

import { useEffect } from "react"

/**
 * Registra il Service Worker al primo mount.
 * Va inserito nel layout root dentro <body>.
 *
 * Il SW abilita la PWA: prompt di installazione su Chrome Android,
 * apertura full-screen senza barre del browser, icona sul launcher.
 */
export function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Silent: l'app continua a funzionare senza SW.
      })
    }

    if (document.readyState === "complete") {
      onLoad()
    } else {
      window.addEventListener("load", onLoad)
      return () => window.removeEventListener("load", onLoad)
    }
  }, [])

  return null
}
