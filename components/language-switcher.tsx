"use client"

import { Languages } from "lucide-react"
import { Locale, useLanguage } from "./language-provider"

const LOCALES: Locale[] = ["lo", "en"]

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage()

  return (
    <div
      aria-label={t("languageSwitcher")}
      className="fixed bottom-4 right-4 z-[999] flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur print:hidden"
      role="group"
    >
      <Languages aria-hidden="true" className="ml-2 text-slate-500" size={15} />
      {LOCALES.map((item) => {
        const active = locale === item
        return (
          <button
            key={item}
            type="button"
            aria-pressed={active}
            onClick={() => setLocale(item)}
            className={[
              "rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
              active
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100",
            ].join(" ")}
          >
            {item === "lo" ? "LAO" : "EN"}
          </button>
        )
      })}
    </div>
  )
}
