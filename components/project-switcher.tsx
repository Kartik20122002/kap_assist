"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { IconSelector, IconLayoutRows } from "@tabler/icons-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { useProjects } from "@/hooks/use-kap"
import { useProjectStore } from "@/store/projectStore"

export function ProjectSwitcher() {
  const router = useRouter()
  const { isMobile } = useSidebar()
  const [open, setOpen] = useState(false)
  const { data: projects } = useProjects()
  const { projectId, setProjectId } = useProjectStore()
  const active = projects?.find((p: any) => p.id === projectId)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger render={<SidebarMenuButton size="lg" className="data-popup-open:bg-sidebar-accent" />}>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <IconLayoutRows className="size-4" />
            </div>
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-semibold">{active?.name ?? "Select project"}</span>
              <span className="truncate text-[11px] text-muted-foreground">KAP Assist</span>
            </div>
            <IconSelector className="ml-auto opacity-60" />
          </PopoverTrigger>
          <PopoverContent side={isMobile ? "bottom" : "right"} align="start" className="w-64 gap-0 p-0">
            <Command>
              <CommandInput placeholder="Find project…" />
              <CommandList>
                <CommandEmpty>No project found.</CommandEmpty>
                <CommandGroup heading="Projects">
                  {(projects ?? []).map((p: any) => (
                    <CommandItem
                      key={p.id}
                      value={`${p.name} ${p.identifier ?? ""}`}
                      data-checked={p.id === projectId}
                      onSelect={() => {
                        setOpen(false)
                        if (p.id === projectId) return
                        setProjectId(p.id)
                        router.push("/app")
                      }}
                    >
                      <span className="truncate">{p.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
