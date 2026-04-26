"use client"

import * as React from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { IconSelector, IconPlus } from "@tabler/icons-react"

export function TeamSwitcher({
  teams, activeProject, setActiveProject
}: {
  teams: {
    name: string
    logo: React.ReactNode
    id: number
  }[], activeProject: any, setActiveProject: any
}) {
  const { isMobile } = useSidebar()

  React.useEffect(() => {
    const selectedTeamStr = localStorage.getItem("selectedProject");
    const selectedTeam = teams?.find((v) => v.id == Number(selectedTeamStr)) ?? teams?.[0] ?? { id: 0 }
    if (selectedTeam && activeProject?.id != selectedTeam.id) setActiveProject(selectedTeam);
  }, [teams])

  if (!activeProject) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              {activeProject.logo}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{activeProject.name}</span>
              <span className="truncate text-xs">{activeProject.id}</span>
            </div>
            <IconSelector className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Projects
              </DropdownMenuLabel>
              {teams?.map((team, index) => (
                <DropdownMenuItem
                  key={team.name}
                  onClick={() => setActiveProject(team)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    {team.logo}
                  </div>
                  {team.name}
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
