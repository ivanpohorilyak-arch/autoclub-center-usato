type BrandLogoProps = {
  compact?: boolean
}

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <div className="select-none">
      <div
        className={
          compact
            ? "text-2xl font-extrabold tracking-tight text-slate-900"
            : "text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl"
        }
      >
        <span>Autoclub</span>
        <span className="ml-1 text-orange-500">.it</span>
      </div>

      <div
        className={
          compact
            ? "mt-1 text-xs font-semibold text-slate-500"
            : "mt-2 text-base font-semibold text-slate-600 sm:text-lg"
        }
      >
        Autoclub Center Usato 2.1
      </div>
    </div>
  )
}
