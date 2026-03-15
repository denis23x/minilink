"use client";

import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "~/components/ui/tooltip";
import { ThemeProvider } from "~/components/theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <SessionProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
