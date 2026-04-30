/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useParams } from "next/navigation"
import useSWR from "swr"

import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import StoryCard from "@/components/story-card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getCurrentUser } from "@/lib/api/user"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useMemo, useState, useEffect } from "react"
import { ApiConfig } from "@/lib/utils"
import { toast } from "sonner"
import { getSprintById } from "@/lib/api/sprint"
import CreateStoryDialog from "@/components/addStoryModal"
import { getStoriesBySprint } from "@/lib/api/story"
import VersionSprintModal from "@/components/versionSprintModal"

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
  const [showUsers, setShowUsers] = useState([`${user?.firstname} ${user?.lastname}`])

  const toggleUr = (username: any) => {
    if (showUsers?.includes(username)) setShowUsers(showUsers?.filter(v => v !== username))
    else setShowUsers(v => [...v, username])
  }

  if (!data) return <div className="p-4">Loading...</div>

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <Card className="bg-muted/40">
        <CardHeader className="space-y-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">
              {version?.name}
            </CardTitle>

            <div className="flex gap-2">
              <CreateStoryDialog projectId={projectId} sprintId={id} assignedToId={user?.id} />
              {isAdmin && (
                <VersionSprintModal
                  projectId={projectId}
                  mode="update"
                  version={version}
                />
              )}
              <div className="flex gap-2 items-center">
                <Select value={version?.status ?? ""} disabled={!isAdmin}>
                  <SelectTrigger disabled={!isAdmin} className="h-7 text-xs w-30">
                    <SelectValue className={"capitalize"} placeholder={version?.status} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="locked">Locked</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
        <CardHeader>
          <CardTitle className="text-sm">User Stories & Tasks</CardTitle>
          {users && users?.length > 1 && <div className="flex gap-2">
            {users?.map((ur: any) => {
              return <Badge className="cursor-pointer" onClick={() => toggleUr(ur)} variant={showUsers?.includes(ur) ? "default" : "outline"} key={`user:${ur}`}>{ur as string}</Badge>
            })}
          </div>}
        </CardHeader>

        <CardContent className="space-y-3">
          {userStories?.filter((story: any) => {
            return showUsers?.includes(story?.assigned_to?.name) ?? false
          })?.map((story: any) => (
            <StoryCard key={story.id} story={story} isAdmin={isAdmin} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}