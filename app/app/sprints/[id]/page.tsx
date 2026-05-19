/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useParams } from "next/navigation"
import useSWR from "swr"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import StoryCard from "@/components/story-card"
import { getCurrentUser } from "@/lib/api/user"
import { useMemo, useState, useEffect } from "react"
import { ApiConfig } from "@/lib/utils"
import { toast } from "sonner"
import { getSprintById } from "@/lib/api/sprint"
import CreateStoryDialog from "@/components/addStoryModal"
import { getStoriesBySprint, updateStory } from "@/lib/api/story"
import VersionSprintModal from "@/components/versionSprintModal"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { mutate } from "swr"
import { IconChevronDown } from "@tabler/icons-react"

export default function SprintPage() {

  const { data: user } = useSWR(["user"], getCurrentUser, ApiConfig)
  const { id } = useParams()
  const { data } = useSWR(["sprint", id], () => getSprintById(id as string), ApiConfig)
  const version = useMemo(() => data?.version, [data])
  const projectId = useMemo(() => version?.project?.id ?? 0, [version])

  const roles = user?.memberships?.map((mm: { project: { id: number }, roles: any[] }) =>
    mm.project?.id === projectId ? mm?.roles ?? [] : []
  ).flat()?.sort((a: any, b: any) => a.id - b.id)

  const isAdmin = roles?.some((role: { id: number }) => role.id == 6)

  const { data: userStories } = useSWR(
    id ? ["sprintStories", id, isAdmin] : null,
    () => getStoriesBySprint(Number(id), projectId, isAdmin),
    ApiConfig
  )

  const today = new Date().toISOString().split("T")[0]

  useEffect(() => {
    if (version?.due_date && version.due_date < today && version.status === "open") {
      toast.error(`Sprint "${version.name}" is past its due date (${version.due_date})`, {
        id: `sprint-${version.id}-overdue`,
        description: isAdmin ? "Consider closing or extending this sprint." : "Contact your admin to close or extend this sprint.",
      })
    }
  }, [version?.due_date, version?.status])

  useEffect(() => {
    if (userStories !== undefined && userStories.length === 0) {
      toast.warning(`No stories assigned to sprint "${version?.name}"`, {
        id: `sprint-${version?.id}-no-stories`,
        description: "Add user stories to start planning work for this sprint.",
      })
    }
  }, [userStories])

  const users = [...new Set(userStories?.map((us: any) => us?.assigned_to?.name))]
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [closeStoriesOpen, setCloseStoriesOpen] = useState(false)
  const [closingStories, setClosingStories] = useState(false)
  const [headerExpanded, setHeaderExpanded] = useState(false)

  useEffect(() => {
    if (user && !selectedUser) {
      setSelectedUser(`${user.firstname} ${user.lastname}`)
    }
  }, [user])

  const visibleStories = userStories?.filter((story: any) =>
    selectedUser ? story?.assigned_to?.name === selectedUser : true
  ) ?? []

  const closeAllStories = async () => {
    const today = new Date().toISOString().split("T")[0]
    const openStories = visibleStories.filter((s: any) => s.status?.name !== "Closed")
    if (openStories.length === 0) {
      toast.info("No open stories to close")
      setCloseStoriesOpen(false)
      return
    }
    setClosingStories(true)
    let closed = 0
    for (const story of openStories) {
      try {
        await updateStory(story.id, { status_id: 5, due_date: story.due_date || today })
        closed++
      } catch {
        toast.error(`Failed to close "${story.subject}"`)
      }
    }
    mutate((key: any) => Array.isArray(key) && key[0] === "sprintStories" && String(key[1]) === String(id))
    setClosingStories(false)
    setCloseStoriesOpen(false)
    toast.success(`Closed ${closed} of ${openStories.length} stories`)
  }

  if (!data) return <div className="p-4">Loading...</div>

  return (
    <div className="px-3 py-3 md:px-6 md:py-6 space-y-3 md:space-y-6">

      {/* HEADER — collapsible on mobile */}
      <Card className="bg-muted/40">
        {/* Always-visible collapsed row */}
        <div
          className="flex items-center justify-between gap-2 px-3 py-3 sm:px-4 cursor-pointer sm:cursor-default"
          onClick={() => setHeaderExpanded(v => !v)}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-semibold text-sm sm:text-lg truncate">{version?.name}</span>
            <Badge
              variant={version?.status === "open" ? "default" : "secondary"}
              className="capitalize text-xs px-2 py-0.5 shrink-0"
            >
              {version?.status}
            </Badge>
          </div>
          <IconChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform sm:hidden ${headerExpanded ? "rotate-180" : ""}`}
          />
        </div>

        {/* Expanded details — always visible on sm+, toggle on mobile */}
        <div className={`${headerExpanded ? "block" : "hidden"} sm:block border-t border-border/30`}>
          <CardHeader className="px-3 py-2 sm:px-4 sm:pt-3 space-y-1.5">
            <div className="flex flex-wrap gap-2 items-center">
              {isAdmin && <CreateStoryDialog projectId={projectId} sprintId={id} assignedToId={user?.id} />}
              {isAdmin && <VersionSprintModal projectId={projectId} mode="update" version={version} />}
            </div>
            <div className="text-xs text-muted-foreground">
              #{version?.id} • {version?.project?.name}
            </div>
          </CardHeader>

          <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <div>
                <div className="opacity-60">Created On</div>
                <div className="text-sm">{version?.created_on?.split("T")[0] || "-"}</div>
              </div>
              <div>
                <div className="opacity-60">Due Date</div>
                <div className="text-sm">{version?.due_date || "-"}</div>
              </div>
              <div>
                <div className="opacity-60">Description</div>
                <div className="text-sm">{version?.description || "-"}</div>
              </div>
              <div>
                <div className="opacity-60">Est. Hours</div>
                <div className="text-sm">{version?.estimated_hours ?? 0}h</div>
              </div>
              <div>
                <div className="opacity-60">Spent</div>
                <div className="text-sm">{version?.spent_hours ?? 0}h</div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* STORIES — flat on mobile, card on desktop */}
      <div className="sm:rounded-lg sm:bg-muted/40 sm:border sm:border-border/50">

        {/* Section header */}
        <div className="flex items-center justify-between gap-2 py-2 sm:px-4 sm:py-3">
          <span className="text-sm font-medium">User Stories & Tasks</span>
          {isAdmin && (
            <Button
              size="sm"
              variant="destructive"
              className="h-7 px-3 text-xs"
              onClick={() => setCloseStoriesOpen(true)}
            >
              Close All Stories
            </Button>
          )}
        </div>

        {/* User filter */}
        {users && users?.length > 1 && (
          <div className="flex flex-wrap gap-2 pb-2 sm:px-4">
            {users?.map((ur: any) => (
              <Badge
                key={`user:${ur}`}
                className="cursor-pointer select-none"
                onClick={() => setSelectedUser(ur)}
                variant={selectedUser === ur ? "default" : "outline"}
              >
                {ur as string}
              </Badge>
            ))}
          </div>
        )}

        {/* Story list — flat items with dividers on mobile, spaced cards on desktop */}
        <div className="sm:px-4 sm:pb-4 sm:space-y-2">
          {visibleStories.map((story: any) => (
            <StoryCard key={story.id} story={story} isAdmin={isAdmin} />
          ))}
        </div>
      </div>

      {/* Close All Stories confirmation */}
      <Dialog open={closeStoriesOpen} onOpenChange={setCloseStoriesOpen}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="text-sm">Close All Stories?</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            This will close <span className="font-semibold text-foreground">
              {visibleStories.filter((s: any) => s.status?.name !== "Closed").length}
            </span> open {visibleStories.filter((s: any) => s.status?.name !== "Closed").length === 1 ? "story" : "stories"} one by one. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="h-8 text-xs" onClick={() => setCloseStoriesOpen(false)} disabled={closingStories}>
              Cancel
            </Button>
            <Button variant="destructive" className="h-8 text-xs" onClick={closeAllStories} disabled={closingStories}>
              {closingStories ? "Closing…" : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
