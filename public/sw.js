// Service Worker minimale per Autoclub Center Usato (PWA).
//
// Obiettivi:
// 1. Soddisfare il criterio Chrome "ho un SW con fetch handler" → mostra il prompt installazione.
// 2. Cachare gli asset statici PWA (icone, manifest) per partenza istantanea offline.
// 3. NON cachare nulla d'altro (l'app è online-only, vogliamo dati sempre freschi).
//
// Versione cache: incrementare quando si aggiornano gli asset statici per invalidare.

const STATIC_CACHE = "autoclub-static-v1"
const STATIC_ASSETS = [
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-512-maskable.png",
  "/apple-touch-icon.png",
  "/favicon.ico",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  // Pulisce cache vecchie quando cambiamo versione.
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith("autoclub-") && name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)

  // Solo GET vengono cachati; tutto il resto va in rete diretta.
  if (event.request.method !== "GET") {
    return
  }

  const isStaticAsset = STATIC_ASSETS.some((path) => url.pathname === path)

  if (isStaticAsset) {
    // Cache-first: dato che sono asset versionati, è ok rispondere dalla cache.
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    )
    return
  }

  // Per tutto il resto (HTML, API, dati live) → sempre rete, niente cache.
  // Non chiamare event.respondWith() lascia il browser gestire normalmente.
})
