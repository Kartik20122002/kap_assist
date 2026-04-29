"use client"

import React, { useMemo } from "react"
import Link from "next/link"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Badge } from "./ui/badge"
import VersionSprintModal from "./versionSprintModal"

type SprintStatus = "all" | "open" | "closed"

interface Sprint {
  id: number
  name: string
  status: string
  created_on: string
  due_date: string
  icon?: React.ReactNode
}

export function SprintList({
  sprints = [],
  icon,
  projectId,
  isAdmin,
}: {
  sprints: Sprint[]
  icon?: React.ReactNode
  projectId?: number
  isAdmin?: boolean
}) {
  const router = useRouter()
  const [filterStatus, setFilterStatus] = React.useState<SprintStatus>("open")

  // Filter sprints based on selected status
  const filteredSprints = useMemo(() => {
    if (filterStatus === "all") return sprints
    return sprints.filter((sprint) => sprint.status === filterStatus)
  }, [sprints, filterStatus])

  // Get status badge variant
  const getStatusVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (status.toLowerCase()) {
      case "open":
        return "default"
      case "closed":
        return "secondary"
      default:
        return "outline"
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "-"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "2-digit",
      })
    } catch {
      return dateString
    }
  }

  return (
    <SidebarGroup className="overflow-y-auto no-scrollbar">
      <div className="space-y-1">
        <div className="flex items-center justify-between px-2">
          <SidebarGroupLabel>Sprints</SidebarGroupLabel>
          {isAdmin && projectId && (
            <VersionSprintModal projectId={projectId} mode="create" />
          )}
        </div>

        {/* Filter buttons */}
        <SidebarGroupLabel className="flex gap-2 px-2">
          {(["all", "open", "closed"] as const).map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? "outline" : "ghost"}
              size="xs"
              className="h-6 text-xs"
              onClick={() => setFilterStatus(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </SidebarGroupLabel>

        {/* Sprint list */}
        <SidebarMenu>
          {filteredSprints.length > 0 ? (
            filteredSprints?.map((sprint) => (
              <SidebarMenuItem key={`sprint-${sprint.id}`} className="rounded-sm bg-foreground/2">
                <SidebarMenuButton
                  onClick={() => router.push(`/app/sprints/${sprint.id}`)}
                  className="flex items-center gap-2 py-3 h-auto"
                  tooltip={sprint.name}
                >
                  {icon && <span>{icon}</span>}
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex w-full items-start justify-between gap-2">
                      <div className="font-medium text-sm truncate">{sprint.name}</div>
                      <Badge variant={getStatusVariant(sprint?.status)} className="text-xs capitalize h-4 px-2 ">
                        {sprint?.status}
                      </Badge>
                    </div>

                    <div className="flex  w-full items-center  gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(sprint.created_on)}
                      </span>
                      to
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(sprint.due_date)}
                      </span>
                    </div>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))
          ) : (
            <div className="px-2 py-4 text-xs text-muted-foreground text-center">
              No sprints found
            </div>
          )}
        </SidebarMenu>
      </div>
    </SidebarGroup>
  )
}
