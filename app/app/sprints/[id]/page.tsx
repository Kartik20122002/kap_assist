"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import useSWR from "swr"
import { toast } from "sonner"
import {
  IconRefresh,
  IconDots,
  IconEdit,
  IconChecks,
  IconSearch,
  IconLayoutNavbarCollapse,
  IconLayoutNavbarExpand,
  IconCalendarEvent,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Kbd } from "@/components/ui/kbd"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import CreateStoryDialog from "@/components/addStoryModal"
import VersionSprintModal from "@/components/versionSprintModal"
import FeatureBreakdownModal from "@/components/featureBreakdownModal"
import { SprintSwitcher } from "@/components/sprint/sprint-switcher"
import { SprintStats } from "@/components/sprint/sprint-stats"
import { StoryRow } from "@/components/sprint/story-row"
import { getSprintById } from "@/lib/api/sprint"
import { getStoriesBySprint } from "@/lib/api/story"
import { getTasks } from "@/lib/api/task"
import { ApiConfig } from "@/lib/utils"
import { useSprints, useUser } from "@/hooks/use-kap"
import { isProjectAdmin, userDisplayName, initials } from "@/lib/session"
import { ACTIVE_STATUSES, DONE_STATUSES, STATUS, runStatusJump } from "@/lib/workflow"
import { healthForStory, storyEstimate, storyPoints, storySpent } from "@/lib/health"
import { refreshSprintData } from "@/lib/refresh"
import { daysBetween, formatShortDate, todayLocal } from "@/lib/date"
import { sprintDayProgress } from "@/lib/sprint"
import { useProjectStore } from "@/store/projectStore"
import { useUiStore } from "@/store/uiStore"

type StatusFilter = "all" | "todo" | "active" | "done"

const statusBucket = (id?: number): Exclude<StatusFilter, "all"> =>
  id !== undefined && DONE_STATUSES.has(id) ? "done" : id !== undefined && ACTIVE_STATUSES.has(id) ? "active" : "todo"

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))

export default function SprintPage() {
  const { id } = useParams()
  const sprintId = String(id)

  const { data: user } = useUser()
  const { data: sprintData } = useSWR(["sprint", sprintId], () => getSprintById(sprintId), ApiConfig)
  const version = sprintData?.version
  const projectId: number = version?.project?.id ?? 0
  const { data: sprintsData } = useSprints(projectId)

  const isAdmin = isProjectAdmin(user, projectId)
  const me = userDisplayName(user)

  // Keep the sidebar's project in sync when a sprint link from another project is opened
  const { projectId: storedProjectId, setProjectId } = useProjectStore()
  useEffect(() => {
    if (projectId && storedProjectId !== projectId) setProjectId(projectId)
  }, [projectId, storedProjectId, setProjectId])

  const { data: stories } = useSWR(
    version ? ["sprintStories", sprintId, isAdmin] : null,
    () => getStoriesBySprint(Number(sprintId), projectId as any, isAdmin),
    ApiConfig
  )

  const storyIdsKey = useMemo(() => (stories ?? []).map((s: any) => s.id).join(","), [stories])
  const { data: tasksByStory } = useSWR(
    stories ? ["sprintTasks", sprintId, storyIdsKey] : null,
    async () => {
      const entries = await Promise.all((stories ?? []).map(async (s: any) => [s.id, await getTasks(s.id)] as const))
      return Object.fromEntries(entries) as Record<number, any[]>
    },
    ApiConfig
  )

  // ── Filters ────────────────────────────────────────────────────────────────
  const people = useMemo(
    () => [...new Set<string>((stories ?? []).map((s: any) => s.assigned_to?.name).filter(Boolean))].sort(),
    [stories]
  )
  const [personOverride, setPersonOverride] = useState<string | null>(null)
  const person = personOverride ?? (people.includes(me) ? me : "all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [query, setQuery] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)

  const byPerson = useMemo(
    () => (stories ?? []).filter((s: any) => person === "all" || s.assigned_to?.name === person),
    [stories, person]
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return byPerson
      .filter((s: any) => statusFilter === "all" || statusBucket(s.status?.id) === statusFilter)
      .filter((s: any) => {
        if (!q) return true
        const hay = [`#${s.id}`, s.subject, ...(tasksByStory?.[s.id] ?? []).flatMap((t: any) => [`#${t.id}`, t.subject])]
        return hay.some((h) => String(h).toLowerCase().includes(q))
      })
      .sort((a: any, b: any) => Number(a.status?.id === STATUS.CLOSED) - Number(b.status?.id === STATUS.CLOSED))
  }, [byPerson, statusFilter, query, tasksByStory])

  const counts = useMemo(() => {
    const c = { all: byPerson.length, todo: 0, active: 0, done: 0 }
    for (const s of byPerson) c[statusBucket(s.status?.id)]++
    return c
  }, [byPerson])

  // ── Stats + health (for the selected person) ───────────────────────────────
  const stats = useMemo(() => {
    let pointsDone = 0, pointsTotal = 0, hoursSpent = 0, hoursEstimated = 0, storiesDone = 0
    for (const s of byPerson) {
      const pts = storyPoints(s) ?? 0
      const done = DONE_STATUSES.has(s.status?.id)
      pointsTotal += pts
      if (done) { pointsDone += pts; storiesDone++ }
      hoursSpent += storySpent(s, tasksByStory?.[s.id])
      hoursEstimated += storyEstimate(s)
    }
    return { pointsDone, pointsTotal, hoursSpent, hoursEstimated, storiesDone, storiesTotal: byPerson.length }
  }, [byPerson, tasksByStory])

  const healthByStory = useMemo(() => {
    const map: Record<number, ReturnType<typeof healthForStory>> = {}
    for (const s of byPerson) map[s.id] = healthForStory(s, tasksByStory?.[s.id])
    return map
  }, [byPerson, tasksByStory])
  const allHealth = useMemo(() => Object.values(healthByStory).flat(), [healthByStory])

  const subjects = useMemo(() => {
    const map: Record<number, string> = {}
    for (const s of stories ?? []) {
      map[s.id] = s.subject
      for (const t of tasksByStory?.[s.id] ?? []) map[t.id] = t.subject
    }
    return map
  }, [stories, tasksByStory])

  // ── Expand / collapse (open work expanded by default) ──────────────────────
  const [expandedOverride, setExpandedOverride] = useState<Record<number, boolean>>({})
  const isExpanded = (s: any) => expandedOverride[s.id] ?? !DONE_STATUSES.has(s.status?.id)
  const setAllExpanded = (value: boolean) =>
    setExpandedOverride(Object.fromEntries(visible.map((s: any) => [s.id, value])))
  const allExpanded = visible.length > 0 && visible.every(isExpanded)

  // ── Focus a story (from the palette or the health list) ───────────────────
  const [highlightId, setHighlightId] = useState<number | null>(null)
  const focusIssue = useUiStore((s) => s.focusIssue)
  const setSprintStories = useUiStore((s) => s.setSprintStories)

  const focusStory = (storyId: number) => {
    const story = (stories ?? []).find((s: any) => s.id === storyId)
    if (!story) return
    if (!visible.some((s: any) => s.id === storyId)) {
      setPersonOverride("all")
      setStatusFilter("all")
      setQuery("")
    }
    setExpandedOverride((prev) => ({ ...prev, [storyId]: true }))
    setHighlightId(storyId)
    requestAnimationFrame(() =>
      setTimeout(() => document.getElementById(`story-${storyId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
    )
    setTimeout(() => setHighlightId((h) => (h === storyId ? null : h)), 1800)
  }

  // The palette asks to focus a story through the store
  useEffect(
    () =>
      useUiStore.subscribe((state) => {
        if (state.focusIssueId == null) return
        const target = state.focusIssueId
        focusIssue(null)
        focusStory(target)
      }),
    [focusStory, focusIssue]
  )

  useEffect(() => {
    setSprintStories(
      (stories ?? []).map((s: any) => ({ id: s.id, subject: s.subject, status: s.status?.name, assignee: s.assigned_to?.name }))
    )
    return () => setSprintStories([])
  }, [stories, setSprintStories])

  // "/" focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !isTyping(e.target) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // ── Actions ────────────────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false)
  const refresh = async () => {
    setRefreshing(true)
    await refreshSprintData()
    setRefreshing(false)
  }

  const [editSprintOpen, setEditSprintOpen] = useState(false)
  const [closeStoriesOpen, setCloseStoriesOpen] = useState(false)
  const closableStories = visible.filter((s: any) => s.status?.id !== STATUS.CLOSED)

  // Honest bulk close: stories with open tasks are skipped and reported, never counted as closed.
  const closeAllStories = async () => {
    setCloseStoriesOpen(false)
    const toastId = toast.loading(`Closing ${closableStories.length} stories…`)
    const failed: string[] = []
    for (const story of closableStories) {
      const tasks = tasksByStory?.[story.id] ?? []
      try {
        await runStatusJump(story, STATUS.CLOSED, {
          storyPoints: storyPoints(story),
          openChildTasks: tasks.filter((t: any) => t.status?.id !== STATUS.CLOSED).length,
        })
      } catch (err: any) {
        failed.push(`#${story.id}: ${err?.message}`)
      }
    }
    await refreshSprintData()
    const ok = closableStories.length - failed.length
    if (failed.length) toast.error(`${ok} of ${closableStories.length} stories closed`, { id: toastId, description: failed.join("\n") })
    else toast.success(`All ${ok} stories closed`, { id: toastId })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!version) {
    return (
      <div className="w-full space-y-3 p-3 md:p-6 lg:px-8">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  const today = todayLocal()
  const progress = sprintDayProgress(version)
  const endDate = progress?.end ?? version.due_date
  const daysLeft = endDate ? daysBetween(today, endDate) : null
  const overdue = version.status === "open" && daysLeft !== null && daysLeft < 0

  return (
    <div className="w-full space-y-3 p-3 md:space-y-4 md:p-6 lg:px-8">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-2">
        <SprintSwitcher sprints={sprintsData?.versions ?? []} current={version} projectId={projectId} isAdmin={isAdmin} />

        <Badge variant={version.status === "open" ? "default" : "secondary"} className="capitalize">
          {version.status}
        </Badge>

        <span className={`flex items-center gap-1 text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
          <IconCalendarEvent className="size-3.5" />
          {progress ? (
            <>
              {formatShortDate(progress.start)} – {formatShortDate(progress.end)}
              {version.status === "open" && today >= progress.start && !overdue && (
                <span className="font-medium text-foreground">
                  · Day {progress.day} of {progress.total}
                </span>
              )}
              {version.status === "open" && daysLeft !== null && (
                <span className="font-medium">
                  · {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? "ends today" : `${-daysLeft}d overdue`}
                </span>
              )}
            </>
          ) : (
            "No dates"
          )}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger render={<Button size="icon" variant="ghost" onClick={refresh} disabled={refreshing} aria-label="Refresh" />}>
              <IconRefresh className={refreshing ? "animate-spin" : ""} />
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
          <FeatureBreakdownModal projectId={projectId} stories={stories ?? []} />
          {isAdmin && <CreateStoryDialog projectId={projectId} sprintId={sprintId} assignedToId={user?.id} />}
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button size="icon" variant="ghost" aria-label="Sprint actions" />}>
                <IconDots />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuItem onClick={() => setEditSprintOpen(true)}>
                  <IconEdit /> Edit sprint
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  disabled={closableStories.length === 0}
                  onClick={() => setCloseStoriesOpen(true)}
                >
                  <IconChecks /> Close shown stories ({closableStories.length})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* Stats + health */}
      {stories === undefined ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        <SprintStats {...stats} health={allHealth} subjects={subjects} onFocus={focusStory} />
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {isAdmin && people.length > 1 && (
          <ToggleGroup
            value={[person]}
            onValueChange={(v: string[]) => v[0] && setPersonOverride(v[0])}
            variant="outline"
            size="sm"
            spacing={0}
            className="max-w-full overflow-x-auto"
          >
            <ToggleGroupItem value="all">Everyone</ToggleGroupItem>
            {people.map((p) => (
              <Tooltip key={p}>
                <TooltipTrigger render={<ToggleGroupItem value={p} aria-label={p} />}>
                  {p === me ? "Me" : initials(p)}
                </TooltipTrigger>
                <TooltipContent>{p}</TooltipContent>
              </Tooltip>
            ))}
          </ToggleGroup>
        )}

        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="all">All {counts.all}</TabsTrigger>
            <TabsTrigger value="todo">To do {counts.todo}</TabsTrigger>
            <TabsTrigger value="active">Active {counts.active}</TabsTrigger>
            <TabsTrigger value="done">Done {counts.done}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-1 items-center gap-1.5">
          <InputGroup className="h-8 flex-1">
            <InputGroupAddon>
              <IconSearch />
            </InputGroupAddon>
            <InputGroupInput
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && (setQuery(""), e.currentTarget.blur())}
              placeholder="Search stories & tasks"
            />
            <InputGroupAddon align="inline-end">
              <Kbd>/</Kbd>
            </InputGroupAddon>
          </InputGroup>
          <Tooltip>
            <TooltipTrigger
              render={<Button size="icon" variant="ghost" onClick={() => setAllExpanded(!allExpanded)} aria-label="Expand or collapse all" />}
            >
              {allExpanded ? <IconLayoutNavbarCollapse /> : <IconLayoutNavbarExpand />}
            </TooltipTrigger>
            <TooltipContent>{allExpanded ? "Collapse all" : "Expand all"}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Stories */}
      <div className="space-y-2">
        {stories === undefined ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : visible.length === 0 ? (
          <Empty className="rounded-xl border border-dashed">
            <EmptyHeader>
              <EmptyTitle>{stories.length === 0 ? "No stories in this sprint" : "Nothing matches"}</EmptyTitle>
              <EmptyDescription>
                {stories.length === 0
                  ? isAdmin
                    ? "Create a story, or add one from the backlog."
                    : "Nothing is assigned to you here yet."
                  : "Try another person, status or search."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          visible.map((story: any) => (
            <StoryRow
              key={story.id}
              story={story}
              tasks={tasksByStory?.[story.id]}
              health={healthByStory[story.id] ?? healthForStory(story, tasksByStory?.[story.id])}
              isAdmin={isAdmin}
              expanded={isExpanded(story)}
              onToggle={() => setExpandedOverride((prev) => ({ ...prev, [story.id]: !isExpanded(story) }))}
              highlighted={highlightId === story.id}
            />
          ))
        )}
      </div>

      {isAdmin && (
        <VersionSprintModal projectId={projectId} mode="update" version={version} open={editSprintOpen} onOpenChange={setEditSprintOpen} hideTrigger />
      )}

      <AlertDialog open={closeStoriesOpen} onOpenChange={setCloseStoriesOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close {closableStories.length} shown stories?</AlertDialogTitle>
            <AlertDialogDescription>
              Each story walks forward to Closed. Stories that still have open tasks are skipped and listed afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={closeAllStories}>
              Close stories
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
