"use client"

import Link from "next/link"
import { useState } from "react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react"

export function NavMain({
  time_entries
}: {
  time_entries: any[]
}) {
  const [open, setOpen] = useState(false)

  const grouped = Object.values(
    (time_entries ?? [])?.reduce((acc: any, entry: any) => {
      const date = entry.spent_on

      if (!acc[date]) {
        acc[date] = { date, hours: 0 }
      }

      acc[date].hours += entry.hours

      return acc
    }, {})
  )
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 7)

  return (<>
    <SidebarGroup className="bg-accent/20 rounded-t-sm border border-b-0 border-accent">
      <div
        className="flex items-center justify-between cursor-pointer px-1"
        onClick={() => setOpen(v => !v)}
      >
        <SidebarGroupLabel className="pointer-events-none">Your Recent Timelogs</SidebarGroupLabel>
        {open
          ? <IconChevronUp className="size-3 opacity-60 shrink-0 mr-1" />
          : <IconChevronDown className="size-3 opacity-60 shrink-0 mr-1" />
        }
      </div>

      {open && (
        <SidebarMenu>
          {grouped.map((item: any) => (
            <SidebarMenuItem key={item.date}>
              <SidebarMenuButton tooltip={item?.date} className="justify-between">
                <span className="text-nowrap">
                  {item.hours}h
                </span>
                <span className="text-xs opacity-70">
                  {item.date}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      )}
    </SidebarGroup>

  </>)
}
