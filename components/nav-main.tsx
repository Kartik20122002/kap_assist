"use client"

import Link from "next/link"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"

export function NavMain({
  epics, time_entries
}: {
  epics: {
    title: string
    url: string
    icon?: React.ReactNode
  }[], time_entries: any[]
}) {
  const router = useRouter()

  const goToProject = (url: string) => router.push(url)

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
      <SidebarGroup>
        <SidebarGroupLabel>Epics</SidebarGroupLabel>
        <SidebarMenu>
          {epics?.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton onClick={() => goToProject(item.url)} tooltip={item.title}>
                {item.icon}
                <span className="text-nowrap">{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup className="bg-accent/20 rounded-t-sm border border-b-0 border-accent">
        <SidebarGroupLabel>Recent Timelogs</SidebarGroupLabel>
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
      </SidebarGroup>

    </>)
}