"use client"
import { AppSidebar } from "@/components/app-sidebar"
import { CommandPalette } from "@/components/command-palette"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { ReactNode } from "react"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Mobile header with sidebar trigger */}
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background/80 px-3 py-2 backdrop-blur md:hidden">
          <SidebarTrigger />
          <span className="text-sm font-medium">KAP Assist</span>
        </header>
        {children}
      </SidebarInset>
      <CommandPalette />
    </SidebarProvider>
  )
}
