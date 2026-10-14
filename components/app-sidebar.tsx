"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { IconTarget, IconStack2, IconLayoutList, IconSearch } from "@tabler/icons-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Kbd } from "@/components/ui/kbd"
import { ProjectSwitcher } from "@/components/project-switcher"
import { NavUser } from "@/components/nav-user"
import { TodayWidget } from "@/components/today-widget"
import { useProjects, useSprints } from "@/hooks/use-kap"
import { pickCurrentSprint } from "@/lib/session"
import { useProjectStore } from "@/store/projectStore"
import { useUiStore } from "@/store/uiStore"

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { projectId, hydrated, hydrate, setProjectId } = useProjectStore()
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen)
  const { data: projects } = useProjects()
  const { data: sprints } = useSprints(projectId)

  React.useEffect(() => {
    if (!hydrated) hydrate()
  }, [hydrated, hydrate])

  // Default to the first project when nothing (or something stale) is stored
  React.useEffect(() => {
    if (!hydrated || !projects?.length) return
    if (!projects.some((p: any) => p.id === projectId)) setProjectId(projects[0].id)
  }, [hydrated, projects, projectId, setProjectId])

  const current = pickCurrentSprint(sprints?.versions)
  const sprintHref = current ? `/app/sprints/${current.id}` : "/app"

  const nav = [
    {
      title: "Sprint",
      href: sprintHref,
      icon: IconTarget,
      active: pathname === "/app" || pathname.startsWith("/app/sprints"),
      badge: current?.name?.split("_").pop(),
    },
    { title: "Backlog", href: "/app/backlog", icon: IconStack2, active: pathname.startsWith("/app/backlog") },
    { title: "Features", href: "/app/features", icon: IconLayoutList, active: pathname.startsWith("/app/features") },
  ]

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <ProjectSwitcher />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Search (Ctrl K)"
              onClick={() => setPaletteOpen(true)}
              className="border bg-background text-muted-foreground shadow-xs hover:text-foreground"
            >
              <IconSearch />
              <span>Search or jump…</span>
            </SidebarMenuButton>
            <SidebarMenuBadge className="group-data-[collapsible=icon]:hidden">
              <Kbd>Ctrl K</Kbd>
            </SidebarMenuBadge>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Work</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton isActive={item.active} tooltip={item.title} render={<Link href={item.href} />}>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                  {item.badge && <SidebarMenuBadge className="text-muted-foreground">{item.badge}</SidebarMenuBadge>}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Today</SidebarGroupLabel>
          <SidebarGroupContent>
            <TodayWidget />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
