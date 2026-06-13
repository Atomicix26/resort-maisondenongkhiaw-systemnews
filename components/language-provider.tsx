"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

export type Locale = "lo" | "en"

const translations = {
  lo: {
    adminPanel: "ໜ້າຈັດການ",
    bookNow: "ຈອງຫ້ອງ",
    bookingLabel: "ຈອງຫ້ອງ",
    checkIn: "ວັນທີເຂົ້າພັກ",
    checkOut: "ວັນທີເຊັກເອົາ",
    chooseThisRoom: "ເລືອກຫ້ອງນີ້",
    featured: "ແນະນຳ",
    heroKicker: "ຍິນດີຕ້ອນຮັບ",
    languageEnglish: "English",
    languageLao: "ລາວ",
    languageSwitcher: "ປ່ຽນພາສາ",
    navHistory: "ປະຫວັດການຈອງ",
    navLogin: "ເຂົ້າລະບົບ",
    navLogout: "ອອກຈາກລະບົບ",
    navProfile: "ໂປຣໄຟລ໌",
    navSignIn: "ເຂົ້າລະບົບ",
    navSignUp: "ສະໝັກສະມາຊິກ",
    noRooms: "ບໍ່ພົບຫ້ອງທີ່ຄົ້ນຫາ",
    people: "ຄົນ",
    roomsCountSuffix: "ຫ້ອງ",
    roomsTitle: "ຫ້ອງພັກ",
    searchPlaceholder: "ຄົ້ນຫາ...",
    selectRoom: "ເລືອກຫ້ອງ",
    validationMissingBookingInfo: "ກະລຸນາເລືອກຫ້ອງ ແລະ ວັນທີໃຫ້ຄົບ",
  },
  en: {
    adminPanel: "Admin Panel",
    bookNow: "Book Now",
    bookingLabel: "Booking",
    checkIn: "Check-in",
    checkOut: "Check-out",
    chooseThisRoom: "Choose this room",
    featured: "Featured",
    heroKicker: "Welcome to",
    languageEnglish: "English",
    languageLao: "Lao",
    languageSwitcher: "Change language",
    navHistory: "Booking History",
    navLogin: "Login",
    navLogout: "Logout",
    navProfile: "Profile",
    navSignIn: "Sign In",
    navSignUp: "Sign Up",
    noRooms: "No rooms found",
    people: "people",
    roomsCountSuffix: "rooms",
    roomsTitle: "Rooms",
    searchPlaceholder: "Search...",
    selectRoom: "Select room",
    validationMissingBookingInfo: "Please select a room and complete the dates",
  },
} as const

export type TranslationKey = keyof typeof translations.lo

type LanguageContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey) => string
}

const STORAGE_KEY = "resort-mdnk1-locale"

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("lo")

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored !== "lo" && stored !== "en") return
    const timer = window.setTimeout(() => setLocaleState(stored), 0)
    return () => window.clearTimeout(timer)
  }, [])

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale)
    window.localStorage.setItem(STORAGE_KEY, nextLocale)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dataset.locale = locale
  }, [locale])

  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    setLocale,
    t: (key) => translations[locale][key] ?? translations.lo[key] ?? key,
  }), [locale, setLocale])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider")
  }
  return context
}
