"use client"
import type { ReactNode } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"
import InitAuth from "./initAuth"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <TooltipProvider>
            <InitAuth />
            {children}
            <Toaster richColors position="top-right" />
        </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}