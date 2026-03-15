"use client"

import { useEffect, useState } from "react"

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 320)
    }

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", onScroll)
    }
  }, [])

  const handleClick = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Torna su"
      className="
        fixed bottom-5 right-5 z-50
        flex items-center justify-center
        bg-slate-900 text-white shadow-xl
        hover:bg-slate-800 active:scale-95
        transition-all duration-200
        h-14 w-14 rounded-full
        md:h-12 md:w-auto md:min-w-[120px] md:px-4 md:rounded-2xl
      "
    >
      <span className="text-xl md:hidden">↑</span>
      <span className="hidden md:inline text-sm font-semibold">↑ Torna su</span>
    </button>
  )
}
