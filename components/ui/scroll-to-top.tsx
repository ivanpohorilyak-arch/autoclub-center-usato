"use client"

import { useEffect, useState } from "react"

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setVisible(true)
      } else {
        setVisible(false)
      }
    }

    window.addEventListener("scroll", toggleVisibility)
    return () => window.removeEventListener("scroll", toggleVisibility)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  if (!visible) return null

  return (
    <button
      onClick={scrollToTop}
      className="
        fixed bottom-6 right-6
        z-50
        flex items-center justify-center
        rounded-full
        bg-violet-600
        text-white
        shadow-lg
        hover:bg-violet-700
        transition
        w-12 h-12
        md:w-auto md:h-auto md:px-4 md:py-3
      "
    >
      <span className="md:hidden text-lg">↑</span>
      <span className="hidden md:block text-sm font-semibold">
        Torna su
      </span>
    </button>
  )
}
