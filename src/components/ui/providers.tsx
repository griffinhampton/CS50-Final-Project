"use client";

import { ThemeProvider } from "next-themes";
import React from "react";

//finds users theme (for light and dark mode)

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      storageKey="cs50-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}