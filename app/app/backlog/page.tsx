"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { toast } from "sonner"
import { IconFileImport, IconTargetArrow, IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import BacklogCreateStoryModal from "@/components/backlogCreateStoryModal"
import { getMissingFields } from "@/components/backlogAddToSprintModal"
import { BacklogRow } from "@/components/backlog/backlog-row"
import { ListToolbar } from "@/components/list/list-toolbar"
import { Pager } from "@/components/list/pager"
import { listIssues } from "@/lib/api/issues"
import { updateIssue } from "@/lib/api/issue"
import { ApiConfig } from "@/lib/utils"
import { useProjects, useSprints, useUser } from "@/hooks/use-kap"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { isProjectAdmin, pickCurrentSprint, sortSprints } from "@/lib/session"
import { refreshSprintData } from "@/lib/refresh"
import { useProjectStore } from "@/store/projectStore"

export default function BacklogPage() {
  const projectId = useProjectStore((s) => s.projectId) ?? 0
  const { data: user } = useUser()
  const { data: projects } = useProjects()
  const project = projects?.find((p: any) => p.id === projectId)
  const isAdmin = isProjectAdmin(user, projectId)

  // Filters live in state; every change goes back to page 1
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [query, setQuery] = useState("")
  const [mine, setMine] = useState(false)
  const [sort, setSort] = useState("id:desc")
  const q = useDebouncedValue(query)

  const { data, isLoading, isValidating } = useSWR(
    projectId ? ["backlogStories", projectId, page, pageSize, q, mine, sort] : null,
    () =>
      listIssues({
        projectId,
        trackerId: 5,
        status: "open",
        noVersion: true,
        assignedTo: mine ? "me" : undefined,
        q,
        sort,
        offset: (page - 1) * pageSize,
        limit: pageSize,
      }),
    { ...ApiConfig, keepPreviousData: true }
  )
  const stories = data?.issues ?? []
  const total = data?.total_count ?? 0

  // ── Multi-select → add to sprint ───────────────────────────────────────────
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const selectedStories = stories.filter((s) => selected.has(s.id))
  const toggle = (id: number, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  const allOnPage = stories.length > 0 && stories.every((s) => selected.has(s.id))

  const { data: sprints } = useSprints(projectId)
  const openSprints = useMemo(() => sortSprints(sprints?.versions ?? []).filter((v: any) => v.status === "open"), [sprints])
  const [targetSprint, setTargetSprint] = useState<string>("")
  const sprintId = targetSprint || String(pickCurrentSprint(openSprints)?.id ?? "")
  const [moving, setMoving] = useState(false)

  const addSelectedToSprint = async () => {
    if (!sprintId) return
    setMoving(true)
    const toastId = toast.loading(`Adding ${selectedStories.length} stories…`)
    const failed: string[] = []
    let added = 0
    for (const story of selectedStories) {
      const missing = getMissingFields(story)
      if (missing.length) {
        failed.push(`#${story.id}: missing ${missing.join(", ")}`)
        continue
      }
      try {
        await updateIssue(story.id, { fixed_version_id: Number(sprintId) })
        added++
      } catch (e: any) {
        failed.push(`#${story.id}: ${e?.message}`)
      }
    }
    await refreshSprintData()
    setSelected(new Set())
    setMoving(false)
    const name = openSprints.find((s: any) => String(s.id) === sprintId)?.name
    if (failed.length) toast.error(`${added} of ${selectedStories.length} added to ${name}`, { id: toastId, description: failed.join("\n") })
    else toast.success(`${added} stories added to ${name}`, { id: toastId })
  }

  const resetPage = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setPage(1)
    setSelected(new Set())
  }

  if (!projectId) {
    return <div className="p-6 text-sm text-muted-foreground">Select a project from the sidebar.</div>
  }

  return (
    <div className="w-full space-y-3 p-3 md:space-y-4 md:p-6 lg:px-8">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            Backlog
            {data && <Badge variant="secondary" className="tabular-nums">{total}</Badge>}
          </h1>
          <p className="text-xs text-muted-foreground">{project?.name} · open user stories not in any sprint</p>
        </div>
        {isAdmin && (
          <>
            <Button variant="outline" render={<Link href={`/app/backlog/bulk-import?projectId=${projectId}`} />}>
              <IconFileImport /> Bulk import
            </Button>
            <BacklogCreateStoryModal projectId={projectId} />
          </>
        )}
      </header>

      <ListToolbar
        query={query}
        onQuery={resetPage(setQuery)}
        mine={mine}
        onMine={resetPage(setMine)}
        sort={sort}
        onSort={resetPage(setSort)}
        placeholder="Search by subject or #id"
      >
        {isAdmin && stories.length > 0 && (
          <label className="flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-md border px-2.5 text-xs">
            <input
              type="checkbox"
              checked={allOnPage}
              onChange={(e) => setSelected(e.target.checked ? new Set(stories.map((s) => s.id)) : new Set())}
              className="size-4 accent-primary"
            />
            Select page
          </label>
        )}
      </ListToolbar>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-background/95 p-2 pl-3 shadow-sm backdrop-blur">
          <span className="text-xs font-medium">{selected.size} selected</span>
          <span className="text-xs text-muted-foreground">→ add to</span>
          <Select value={sprintId} onValueChange={(v) => v && setTargetSprint(String(v))}>
            <SelectTrigger className="h-8 min-w-36 text-xs">
              <SelectValue>{openSprints.find((s: any) => String(s.id) === sprintId)?.name ?? "Choose sprint"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {openSprints.map((s: any) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={addSelectedToSprint} disabled={!sprintId || moving}>
            <IconTargetArrow /> {moving ? "Adding…" : "Add to sprint"}
          </Button>
          <Button variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>
            <IconX /> Clear
          </Button>
        </div>
      )}

      {/* List */}
      <div className={`space-y-2 transition-opacity ${isValidating && data ? "opacity-60" : ""}`}>
        {isLoading && !data ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
        ) : stories.length === 0 ? (
          <Empty className="rounded-xl border border-dashed">
            <EmptyHeader>
              <EmptyTitle>{q || mine ? "Nothing matches" : "Backlog is empty"}</EmptyTitle>
              <EmptyDescription>{q || mine ? "Try another search or Everyone." : "New stories without a sprint show up here."}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          stories.map((story) => (
            <BacklogRow
              key={story.id}
              story={story}
              isAdmin={isAdmin}
              projectId={projectId}
              selected={selected.has(story.id)}
              onSelect={(c) => toggle(story.id, c)}
            />
          ))
        )}
      </div>

      {total > 0 && (
        <Pager
          page={page}
          pageSize={pageSize}
          total={total}
          loading={isValidating}
          onPage={(p) => {
            setPage(p)
            setSelected(new Set())
            window.scrollTo({ top: 0, behavior: "smooth" })
          }}
          onPageSize={resetPage(setPageSize)}
        />
      )}
    </div>
  )
}
