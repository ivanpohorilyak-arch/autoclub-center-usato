"use client"

import ScrollToTop from "@/components/ui/scroll-to-top"

export default function RicercaPage() {
  return (
    <>
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <h1 className="text-3xl font-bold text-slate-900">Ricerca</h1>

        <p className="mt-2 text-slate-500">
          Cerca vetture per targa, modello o numero chiave.
        </p>

        <div className="mt-6">
          {/* Qui rimane il contenuto della tua pagina ricerca già esistente */}
        </div>
      </div>

      <ScrollToTop />
    </>
  )
}
