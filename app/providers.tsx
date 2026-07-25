"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
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
        <Toaster 
          position="top-center" 
          richColors 
          duration={4000}
          theme="light"
        />
      </LanguageProvider>
    </SessionProvider>
  );
}
