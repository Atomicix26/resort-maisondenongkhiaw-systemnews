"use client";

import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from "@/components/language-provider";
import LanguageSwitcher from "@/components/language-switcher";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <LanguageProvider>
        {children}
        <LanguageSwitcher />
      </LanguageProvider>
    </SessionProvider>
  );
}
