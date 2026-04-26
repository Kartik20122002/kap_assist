"use client"
import type { ReactNode } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"
import InitAuth from "./initAuth"
import { ThemeProvider } from "@/components/theme-provider"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <TooltipProvider>
            <InitAuth />
            {children}
        </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}