/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState, useMemo } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/api/user"
import { getBugStories } from "@/lib/api/story"
import { getProjects } from "@/lib/api/project"
import { ApiConfig, statusStyles } from "@/lib/utils"
import { toast } from "sonner"
import BacklogEditStoryModal from "@/components/backlogEditStoryModal"

const PAGE_SIZE = 15

export default function BugsPage() {
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
    projectId ? ["bugStories", projectId, offset] : null,
    () => getBugStories(projectId, offset, PAGE_SIZE),
    ApiConfig
  )

  const bugs = (data?.issues ?? []).filter((b: any) => b.tracker?.id === 15)
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
              <CardTitle className="text-lg">Bugs</CardTitle>
              {project && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {project.name} · Open bugs not assigned to any sprint
                </div>
              )}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPage(p => p - 1)} disabled={page === 0}>Prev</Button>
                <span className="px-1">{page + 1} / {totalPages}</span>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Next</Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* BUGS LIST */}
      <Card className="bg-muted/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            Bug Reports
            {totalCount > 0 && <Badge variant="outline" className="text-[10px]">{totalCount}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data === undefined && <div className="text-xs text-muted-foreground">Loading…</div>}
          {data !== undefined && bugs.length === 0 && (
            <div className="text-xs text-muted-foreground">No open bugs found.</div>
          )}
          {bugs.map((bug: any) => (
            <BugCard key={bug.id} bug={bug} isAdmin={isAdmin} />
          ))}
          {totalPages > 1 && bugs.length > 0 && <Pagination />}
        </CardContent>
      </Card>
    </div>
  )
}

function BugCard({ bug, isAdmin }: { bug: any; isAdmin: boolean }) {
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
                navigator.clipboard.writeText(String(bug.id))
                  .then(() => toast.success(`#${bug.id} copied`))
              }
            >
              #{bug.id}
            </span>
            <div className="text-base font-medium line-clamp-2 sm:line-clamp-1">
              {bug.subject}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <span className={`px-2 rounded-full text-xs ${statusStyles[bug?.status?.name] ?? "bg-muted text-muted-foreground"}`}>
              {bug.status?.name}
            </span>
            {isAdmin && <BacklogEditStoryModal story={bug} />}
          </div>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 text-xs">
          <div>
            <span className="opacity-60">Assigned</span>
            <div>{bug.assigned_to?.name || "-"}</div>
          </div>
          <div>
            <span className="opacity-60">Author</span>
            <div>{bug.author?.name || "-"}</div>
          </div>
          <div>
            <span className="opacity-60">Priority</span>
            <div>{bug.priority?.name || "-"}</div>
          </div>
          <div>
            <span className="opacity-60">Est. Hours</span>
            <div>{bug.estimated_hours ?? "-"}</div>
          </div>
        </div>

        {bug.due_date && (
          <div className="text-[10px] text-muted-foreground">
            Due: {bug.due_date}
          </div>
        )}

      </CardContent>
    </Card>
  )
}
