/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useParams } from "next/navigation"
import useSWR from "swr"

import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import StoryCard from "@/components/story-card"
import { getCurrentUser } from "@/lib/api/user"
import { useMemo, useState, useEffect, useCallback } from "react"
import { ApiConfig } from "@/lib/utils"
import { toast } from "sonner"
import { getSprintById } from "@/lib/api/sprint"
import CreateStoryDialog from "@/components/addStoryModal"
import { getStoriesBySprint, updateStory } from "@/lib/api/story"
import VersionSprintModal from "@/components/versionSprintModal"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { mutate } from "swr"

export function SwitchDemo() {
  return (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" />
      <Label htmlFor="airplane-mode">Airplane Mode</Label>
    </div>
  )
}

export default function SprintPage() {

  const { data: user } = useSWR(
    ["user"],
    getCurrentUser, ApiConfig
  )

  const { id } = useParams()

  const { data } = useSWR(["sprint", id], () => getSprintById(id as string), ApiConfig)

  const version = useMemo(() => data?.version, [data])

  const projectId = useMemo(() => version?.project?.id ?? 0, [version]);

  const roles = user?.memberships?.map((mm: { project: { id: number }, roles: any[] }) => mm.project?.id === projectId ? mm?.roles ?? [] : []).flat()?.sort((a: any, b: any) => a.id - b.id);

  const isAdmin = roles?.some((role: { id: number }) => role.id == 6)

  const { data: userStories } = useSWR(id ? ["sprintStories", id, isAdmin] : null, () => getStoriesBySprint(Number(id), projectId, isAdmin), ApiConfig);

  const today = new Date().toISOString().split("T")[0]

  // A7 — Sprint is overdue but still open
  useEffect(() => {
    if (version?.due_date && version.due_date < today && version.status === "open") {
      toast.error(`Sprint "${version.name}" is past its due date (${version.due_date})`, {
        id: `sprint-${version.id}-overdue`,
        description: isAdmin ? "Consider closing or extending this sprint." : "Contact your admin to close or extend this sprint.",
      })
    }
  }, [version?.due_date, version?.status])

  // A8 — Sprint has no stories
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
    const openStories = visibleStories.filter(
      (s: any) => s.status?.name !== "Closed"
    )
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
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">

      {/* HEADER */}
      <Card className="bg-muted/40">
        <CardHeader className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <CardTitle className="text-lg">
              {version?.name}
            </CardTitle>

            <div className="flex flex-wrap gap-2 items-center">
              {isAdmin && <CreateStoryDialog projectId={projectId} sprintId={id} assignedToId={user?.id} />}
              {isAdmin && (
                <VersionSprintModal
                  projectId={projectId}
                  mode="update"
                  version={version}
                />
              )}
              <Badge
                variant={version?.status === "open" ? "default" : "secondary"}
                className="capitalize text-xs px-2.5 py-0.5"
              >
                {version?.status}
              </Badge>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            #{version?.id} • {version?.project?.name}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* CORE INFO */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">

            <div>
              <div className="opacity-60">Created On</div>
              <div className="text-sm">{version?.created_on || "-"}</div>
            </div>

            <div>
              <div className="opacity-60">Due Date</div>
              <div className="text-sm">{version?.due_date}</div>
            </div>

            <div>
              <div className="opacity-60">Description</div>
              <div className="text-sm">{version?.description}</div>
            </div>

            <div>
              <div className="opacity-60">Estimated Hours</div>
              <div className="text-sm">{version?.estimated_hours ?? 0}h</div>
            </div>

            <div>
              <div className="opacity-60">Spent</div>
              <div className="text-sm">{version?.spent_hours ?? 0}h</div>
            </div>

          </div>

        </CardContent>
      </Card>

      {/* CHILDREN TREE */}
      <Card className="bg-muted/40">
        <CardHeader className="px-2 py-3 sm:px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-sm">User Stories & Tasks</CardTitle>
            {isAdmin && (
              <Button
                size="sm"
                variant="destructive"
                className="h-7 px-3 text-xs self-start sm:self-auto"
                onClick={() => setCloseStoriesOpen(true)}
              >
                Close All Stories
              </Button>
            )}
          </div>
          {users && users?.length > 1 && (
            <div className="flex flex-wrap gap-2">
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
        </CardHeader>

        <CardContent className="px-2 pb-3 sm:px-4 space-y-2">
          {visibleStories.map((story: any) => (
            <StoryCard key={story.id} story={story} isAdmin={isAdmin} />
          ))}
        </CardContent>
      </Card>

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