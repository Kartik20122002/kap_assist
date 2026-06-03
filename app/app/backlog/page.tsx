/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState, useMemo } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/api/user"
import { getBacklogStories } from "@/lib/api/story"
import { getProjects } from "@/lib/api/project"
import { ApiConfig, statusStyles } from "@/lib/utils"
import { toast } from "sonner"
import BacklogCreateStoryModal from "@/components/backlogCreateStoryModal"
import BacklogEditStoryModal from "@/components/backlogEditStoryModal"
import BacklogAddToSprintModal from "@/components/backlogAddToSprintModal"

const PAGE_SIZE = 15

export default function BacklogPage() {
  const [projectId, setProjectId] = useState<number>(0)
  const [page, setPage] = useState(0)

  useEffect(() => {
    const stored = localStorage.getItem("selectedProject")
    if (stored) setProjectId(Number(stored))
  }, [])

  useEffect(() => { setPage(0) }, [projectId])

  const { data: user } = useSWR(["user"], getCurrentUser, ApiConfig)
  const { data: projects } = useSWR(["projects"], getProjects, ApiConfig)

  const project = useMemo(
    () => projects?.find((p: any) => p.id === projectId),
    [projects, projectId]
  )

  const roles = useMemo(() => {
    if (!user?.memberships || !projectId) return []
    return user.memberships
      .map((mm: any) => mm.project?.id === projectId ? mm.roles ?? [] : [])
      .flat()
      .sort((a: any, b: any) => a.id - b.id)
  }, [user?.memberships, projectId])

  const isAdmin = roles?.some((role: any) => role.id === 6)
  const offset = page * PAGE_SIZE

  const { data } = useSWR(
    projectId ? ["backlogStories", projectId, offset] : null,
    () => getBacklogStories(projectId, offset, PAGE_SIZE),
    ApiConfig
  )

  const stories = (data?.issues ?? []).filter((s: any) => s.tracker?.id === 5)
  const totalCount = data?.total_count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  if (!projectId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No project selected. Please select a project from the sidebar.
      </div>
    )
  }

  const Pagination = () => (
    <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPage(p => p - 1)} disabled={page === 0}>Prev</Button>
      <span>Page {page + 1} of {totalPages} · {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount}</span>
      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Next</Button>
    </div>
  )

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">

      {/* HEADER */}
      <Card className="bg-muted/40">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div>
              <CardTitle className="text-lg">Backlog</CardTitle>
              {project && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {project.name} · User stories not assigned to any sprint
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {totalPages > 1 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPage(p => p - 1)} disabled={page === 0}>Prev</Button>
                  <span className="px-1">{page + 1} / {totalPages}</span>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Next</Button>
                </div>
              )}
              {isAdmin && projectId > 0 && (
                <>
                  <a
                    href={`/app/backlog/bulk-import?projectId=${projectId}`}
                    className="inline-flex items-center h-7 px-3 text-xs rounded-md border border-border hover:bg-input/50 transition-colors font-medium"
                  >
                    Add Bulk Stories
                  </a>
                  <BacklogCreateStoryModal projectId={projectId} />
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* STORIES */}
      <Card className="bg-muted/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            User Stories
            {totalCount > 0 && <Badge variant="outline" className="text-[10px]">{totalCount}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data === undefined && <div className="text-xs text-muted-foreground">Loading…</div>}
          {data !== undefined && stories.length === 0 && (
            <div className="text-xs text-muted-foreground">No backlog user stories found.</div>
          )}
          {stories.map((story: any) => (
            <BacklogStoryCard key={story.id} story={story} isAdmin={isAdmin} projectId={projectId} />
          ))}
          {totalPages > 1 && stories.length > 0 && <Pagination />}
        </CardContent>
      </Card>
    </div>
  )
}

export function BacklogStoryCard({
  story,
  isAdmin,
  projectId,
  showAddToSprint = true,
}: {
  story: any
  isAdmin: boolean
  projectId: number
  showAddToSprint?: boolean
}) {
  const storyPoints =
    story.rb_story_points ||
    story.custom_fields?.find((f: any) => f.name.includes("Story Point"))?.value ||
    "-"

  const acceptance = story.custom_fields?.find((f: any) =>
    f.name.includes("Acceptance")
  )?.value

  return (
    <Card className="bg-muted/40 transition">
      <CardContent className="p-3 space-y-2">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
          <div className="min-w-0">
            <span
              className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              title="Click to copy ID"
              onClick={() =>
                navigator.clipboard.writeText(String(story.id))
                  .then(() => toast.success(`#${story.id} copied`))
              }
            >
              #{story.id}
            </span>
            <div className="text-base font-medium line-clamp-2 sm:line-clamp-1">
              {story.subject}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <span className={`px-2 rounded-full text-xs ${statusStyles[story?.status?.name] ?? "bg-muted text-muted-foreground"}`}>
              {story.status?.name}
            </span>
            {isAdmin && <BacklogEditStoryModal story={story} />}
            {isAdmin && showAddToSprint && story.tracker?.id === 5 && (
              <BacklogAddToSprintModal story={story} projectId={projectId} />
            )}
          </div>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 text-xs">
          <div>
            <span className="opacity-60">Assigned</span>
            <div>{story.assigned_to?.name || "-"}</div>
          </div>
          <div>
            <span className="opacity-60">Author</span>
            <div>{story.author?.name || "-"}</div>
          </div>
          <div>
            <span className="opacity-60">Story Points</span>
            <div>{storyPoints}</div>
          </div>
          <div>
            <span className="opacity-60">Est. Hours</span>
            <div>{story.estimated_hours ?? "-"}</div>
          </div>
        </div>

        {acceptance && (
          <div className="text-[10px] text-muted-foreground line-clamp-2">{acceptance}</div>
        )}
      </CardContent>
    </Card>
  )
}
