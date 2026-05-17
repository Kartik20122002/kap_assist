
"use client"
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ReactNode} from "react"

export default function AppLayout({ children }: { children: ReactNode }) {

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Mobile header with sidebar trigger */}
        <header className="flex md:hidden items-center gap-2 px-3 py-2 border-b bg-background sticky top-0 z-20">
          <SidebarTrigger />
          <span className="text-sm font-medium">KAP Assist</span>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}