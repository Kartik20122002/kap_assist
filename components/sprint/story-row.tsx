"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  IconChevronRight,
  IconDots,
  IconCopy,
  IconExternalLink,
  IconChecks,
} from "@tabler/icons-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import CreateTaskDialog from "@/components/addTaskModel"
import EditStoryDialog from "@/components/editStoryModal"
import { StatusMenu } from "./status-menu"
import { ReopenButton } from "./reopen-button"
import { TaskRow } from "./task-row"
import { HealthMarker } from "./health-marker"
import { FeatureChip } from "./feature-chip"
import { canReopen, runStatusJump, STATUS } from "@/lib/workflow"
import { storyEstimate, storyPoints, storySpent, type HealthItem } from "@/lib/health"
import { refreshSprintData } from "@/lib/refresh"
import { initials } from "@/lib/session"
import { cn } from "@/lib/utils"

const kapBaseUrl = () =>
  (typeof window !== "undefined" && localStorage.getItem("baseUrl")) || "https://kap01.kpit.com/kap"

export function StoryRow({
  story,
  tasks,
  health,
  isAdmin,
  expanded,
  onToggle,
  highlighted,
}: {
  story: any
  tasks: any[] | undefined
  health: HealthItem[]
  isAdmin: boolean
  expanded: boolean
  onToggle: () => void
  highlighted?: boolean
}) {
  const [closeTasksOpen, setCloseTasksOpen] = useState(false)
  const [closingTasks, setClosingTasks] = useState(false)

  const points = storyPoints(story)
  const spent = storySpent(story, tasks)
  const est = storyEstimate(story)
  const pct = est > 0 ? Math.min(100, Math.round((spent / est) * 100)) : 0
  const openTasks = (tasks ?? []).filter((t) => t.status?.id !== STATUS.CLOSED)
  const closed = story.status?.id === STATUS.CLOSED
  const storyHealth = health.filter((h) => h.issueId === story.id)
  const taskHealth = (id: number) => health.filter((h) => h.issueId === id)

  const copyId = () =>
    navigator.clipboard.writeText(String(story.id)).then(() => toast.success(`#${story.id} copied`))

  // Honest bulk close: each task walks its own chain; failures are reported, not hidden.
  const closeAllTasks = async () => {
    setCloseTasksOpen(false)
    setClosingTasks(true)
    const toastId = toast.loading(`Closing ${openTasks.length} task(s)…`)
    const failed: string[] = []
    for (const task of openTasks) {
      try {
        await runStatusJump(task, STATUS.CLOSED)
      } catch (err: any) {
        failed.push(`#${task.id}: ${err?.message}`)
      }
    }
    await refreshSprintData()
    setClosingTasks(false)
    if (failed.length) {
      toast.error(`${openTasks.length - failed.length} of ${openTasks.length} tasks closed`, {
        id: toastId,
        description: failed.join("\n"),
      })
    } else {
      toast.success(`All ${openTasks.length} tasks closed`, { id: toastId })
    }
  }

  return (
    <section
      id={`story-${story.id}`}
      className={cn(
        "scroll-mt-28 rounded-xl border bg-card transition-[box-shadow,opacity] duration-500",
        highlighted && "ring-2 ring-primary/50",
        closed && !expanded && "opacity-70"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2 p-2.5 sm:p-3">
        <Button
          size="icon"
          variant="ghost"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse tasks" : "Expand tasks"}
          className="shrink-0"
        >
          <IconChevronRight className={cn("transition-transform", expanded && "rotate-90")} />
        </Button>

        <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <button type="button" onClick={onToggle} className="block w-full text-left">
              <span className="mr-1.5 text-[11px] text-muted-foreground tabular-nums">#{story.id}</span>
              <span className="text-sm leading-snug font-medium">{story.subject}</span>
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <FeatureChip story={story} canEdit={isAdmin} />
              <HealthMarker items={storyHealth} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {canReopen(story) && isAdmin ? (
              <div className="flex items-center gap-1.5">
                <StatusMenu issue={story} canEdit={false} />
                <ReopenButton issue={story} />
              </div>
            ) : (
              <StatusMenu
                issue={story}
                canEdit={isAdmin && tasks !== undefined}
                ctx={{ storyPoints: points, openChildTasks: openTasks.length }}
              />
            )}

            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">{points ?? "–"}</span> SP
            </span>

            <Tooltip>
              <TooltipTrigger render={<span className="flex items-center gap-2" />}>
                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn("block h-full rounded-full bg-primary", spent > est && est > 0 && "bg-amber-500")}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  <span className="font-medium text-foreground">{spent}h</span> / {est}h
                </span>
              </TooltipTrigger>
              <TooltipContent>Spent {spent}h of {est}h estimated</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger render={<span />}>
                <Avatar className="size-6">
                  <AvatarFallback className="text-[10px]">{initials(story.assigned_to?.name)}</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>{story.assigned_to?.name ?? "Unassigned"}</TooltipContent>
            </Tooltip>

            <div className="ml-auto flex items-center gap-0.5 lg:ml-0">
              {isAdmin && (
                <CreateTaskDialog
                  parent_issue_id={story.id}
                  project_id={story.project?.id}
                  assigned_to_id={story.assigned_to?.id}
                  parentSubject={story.subject}
                />
              )}
              {isAdmin && <EditStoryDialog story={story} />}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button size="icon" variant="ghost" className="text-muted-foreground" aria-label="More actions" />}
                >
                  <IconDots />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-48">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={copyId}>
                      <IconCopy /> Copy ID
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.open(`${kapBaseUrl()}/issues/${story.id}`, "_blank")}>
                      <IconExternalLink /> Open in KAP
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  {isAdmin && openTasks.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem disabled={closingTasks} onClick={() => setCloseTasksOpen(true)}>
                        <IconChecks /> Close all tasks ({openTasks.length})
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks */}
      {expanded && (
        <div className="border-t px-2 py-1.5 sm:pl-12">
          {tasks === undefined ? (
            <div className="space-y-1.5 p-1.5">
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-7 w-1/2" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex items-center justify-between gap-2 px-2 py-2 text-xs text-muted-foreground">
              No tasks yet
              {isAdmin && (
                <CreateTaskDialog
                  parent_issue_id={story.id}
                  project_id={story.project?.id}
                  assigned_to_id={story.assigned_to?.id}
                  parentSubject={story.subject}
                />
              )}
            </div>
          ) : (
            tasks.map((task) => <TaskRow key={task.id} task={task} health={taskHealth(task.id)} />)
          )}
        </div>
      )}

      <AlertDialog open={closeTasksOpen} onOpenChange={setCloseTasksOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close {openTasks.length} open task(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Each task in &quot;{story.subject}&quot; walks forward to Closed. Any task KAP refuses is listed afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={closeAllTasks}>Close tasks</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
