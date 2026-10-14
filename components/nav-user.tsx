"use client"

import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { IconSelector, IconLogout, IconExternalLink, IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { useAuthStore } from "@/store/authStore"
import { useUser } from "@/hooks/use-kap"
import { useProjectStore } from "@/store/projectStore"
import { initials, isProjectAdmin, userDisplayName } from "@/lib/session"

export function NavUser() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const baseUrl = useAuthStore((s) => s.baseUrl)
  const logout = useAuthStore((s) => s.logout)
  const { data: user } = useUser()
  const projectId = useProjectStore((s) => s.projectId)

  if (!user) return null
  const name = userDisplayName(user)
  const role = isProjectAdmin(user, projectId) ? "Admin" : "Member"

  const handleLogout = () => {
    logout()
    localStorage.removeItem("selectedProject")
    router.push("/login")
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" className="aria-expanded:bg-sidebar-accent" />}>
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-xs text-primary-foreground">{initials(name)}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-medium">{name}</span>
              <span className="truncate text-[11px] text-muted-foreground">
                {user.login} · {role}
              </span>
            </div>
            <IconSelector className="ml-auto size-4 opacity-60" />
          </DropdownMenuTrigger>

          <DropdownMenuContent className="min-w-56" side={isMobile ? "bottom" : "right"} align="end" sideOffset={4}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={(v) => setTheme(String(v))}>
                <DropdownMenuRadioItem value="light">
                  <IconSun /> Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">
                  <IconMoon /> Dark
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">
                  <IconDeviceDesktop /> System
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.open(`${baseUrl || "https://kap01.kpit.com/kap"}/my/account`, "_blank")}>
              <IconExternalLink /> KAP account
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <IconLogout /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
