"use client"
import useSWR from "swr"
import { getTasks, updateTask } from "@/lib/api/task"
import { getTimeEntries } from "@/lib/api/time"
import TimeLogDialog from "./timelogModal"
import TaskNoteDialog from "./tasknoteModal"
import { ApiConfig, statusStyles } from "@/lib/utils"
import EditTaskDialog from "./editTaskModal"
import CreateTaskDialog from "./addTaskModel"
import EditStoryDialog from "./editStoryModal"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { mutate } from "swr"

export default function StoryCard({ story, isAdmin }: { story: any, isAdmin: any }) {
  const storyPoints =
    story.rb_story_points ||
    story.custom_fields?.find((f: any) =>
      f.name.includes("Story Point")
    )?.value || "0"

  const acceptance =
    story.custom_fields?.find((f: any) =>
      f.name.includes("Acceptance")
    )?.value

  const { data: time_entries } = useSWR(
    story?.project?.id ? ["time_entries", story?.project?.id, story?.assigned_to?.id] : null,
    () => getTimeEntries(story?.project?.id, story?.assigned_to?.id), ApiConfig
  )

  const { data: tasks } = useSWR(
    story?.id ? ["tasks", story?.id] : null,
    () => getTasks(story?.id), ApiConfig
  )

  const timeMap =
    time_entries?.reduce((acc: any, t: any) => {
      const id = t.issue?.id
      if (!id) return acc
      if (!acc[id]) acc[id] = 0
      acc[id] += t.hours
      return acc
    }, {}) || {}

  const storyTime =
    tasks?.reduce((sum: number, task: any) => {
      return sum + (timeMap[task.id] || 0)
    }, 0) || 0

  const today = new Date().toISOString().split("T")[0]
  const CLOSED_STATUSES = ["Closed", "Implemented", "Rejected"]

  useEffect(() => {
    if (tasks !== undefined && tasks.length === 0) {
      toast.warning(`No tasks yet for "${story.subject}"`, {
        id: `story-${story.id}-no-tasks`,
        description: "Add at least one task so work can be tracked and time logged.",
      })
    }
  }, [tasks])

  useEffect(() => {
    if (storyTime > 0 && ["New", "Assigned"].includes(story.status?.name)) {
      toast.warning(`"${story.subject}" has ${storyTime}h logged but is still "${story.status?.name}"`, {
        id: `story-${story.id}-stale-status`,
        description: "Consider moving this story to In Progress.",
      })
    }
  }, [storyTime, story.status?.name])

  useEffect(() => {
    if (story.due_date && story.due_date < today && !CLOSED_STATUSES.includes(story.status?.name)) {
      toast.error(`"${story.subject}" is past due (${story.due_date})`, {
        id: `story-${story.id}-overdue`,
        description: "Update the due date or close this story.",
      })
    }
  }, [story.due_date, story.status?.name])

  useEffect(() => {
    if (!acceptance && !CLOSED_STATUSES.includes(story.status?.name)) {
      toast.warning(`"${story.subject}" has no acceptance criteria`, {
        id: `story-${story.id}-no-ac`,
        description: "Acceptance criteria are required before moving to Ready.",
      })
    }
  }, [acceptance, story.status?.name])

  const [closeTasksOpen, setCloseTasksOpen] = useState(false)
  const [closingTasks, setClosingTasks] = useState(false)

  const openTasks = tasks?.filter((t: any) => t.status?.name !== "Closed") ?? []

  const closeAllTasks = async () => {
    const today = new Date().toISOString().split("T")[0]
    if (openTasks.length === 0) {
      toast.info("No open tasks to close")
      setCloseTasksOpen(false)
      return
    }
    setClosingTasks(true)
    let closed = 0
    for (const task of openTasks) {
      try {
        await updateTask(task.id, { status_id: 5, due_date: task.due_date || today })
        closed++
      } catch {
        toast.error(`Failed to close "${task.subject}"`)
      }
    }
    mutate(["tasks", story.id])
    setClosingTasks(false)
    setCloseTasksOpen(false)
    toast.success(`Closed ${closed} of ${openTasks.length} tasks`)
  }

  return (
    <div className="py-3 border-b border-border/15 last:border-b-0 sm:rounded-lg sm:border sm:border-border/40 sm:bg-muted/40 sm:py-0">
      <div className="sm:p-3 space-y-2">

        {/* Title row + admin icon actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-semibold leading-snug line-clamp-2 flex-1">
            {story.subject}
          </div>
          {isAdmin && (
            <div className="flex items-center gap-0.5 shrink-0 -mt-0.5">
              <CreateTaskDialog
                parent_issue_id={story?.id}
                project_id={story?.project?.id}
                assigned_to_id={story.assigned_to?.id}
                iconOnly
              />
              <EditStoryDialog
                story={story}
                sprintId={story.fixed_version?.id ?? story.fixed_version_id}
                iconOnly
              />
            </div>
          )}
        </div>

        {/* Compact meta row */}
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs">
          <span className={`px-2 py-0.5 rounded-full font-medium ${statusStyles[story?.status?.name]}`}>
            {story.status?.name}
          </span>
          <span className="text-muted-foreground">
            SP <span className="font-semibold text-foreground">{storyPoints}</span>
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            ⏱ <span className="text-foreground">{storyTime}h</span>
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground truncate max-w-[150px]">
            {story.assigned_to?.name || "Unassigned"}
          </span>
        </div>

        {/* Acceptance criteria */}
        {acceptance && (
          <div className="text-[10px] text-muted-foreground bg-muted/50 rounded-md px-2 py-1 line-clamp-2 leading-relaxed">
            {acceptance}
          </div>
        )}

        {/* Task list */}
        {tasks?.length > 0 && (
          <div className="space-y-1 border-t border-border/30 pt-1.5">
            {isAdmin && openTasks.length > 0 && (
              <div className="flex justify-end pb-0.5">
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-6 px-3 text-[10px]"
                  onClick={() => setCloseTasksOpen(true)}
                >
                  Close All Tasks
                </Button>
              </div>
            )}
            {tasks.map((task: any) => {
              const taskTime = timeMap[task.id] || 0
              const taskHistory =
                time_entries
                  ?.filter((t: any) => t.issue?.id === task.id)
                  ?.sort((a: any, b: any) =>
                    new Date(b.spent_on).getTime() - new Date(a.spent_on).getTime()
                  ) || []
              return (
                <TaskCard
                  key={`task:${task.id}`}
                  projectId={story?.project?.id}
                  task={task}
                  taskTime={taskTime}
                  taskHistory={taskHistory}
                />
              )
            })}
          </div>
        )}

      </div>

      <Dialog open={closeTasksOpen} onOpenChange={setCloseTasksOpen}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="text-sm">Close All Tasks?</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            This will close <span className="font-semibold text-foreground">{openTasks.length}</span>{" "}
            open {openTasks.length === 1 ? "task" : "tasks"} in{" "}
            <span className="font-semibold text-foreground">"{story.subject}"</span> one by one. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="h-8 text-xs" onClick={() => setCloseTasksOpen(false)} disabled={closingTasks}>
              Cancel
            </Button>
            <Button variant="destructive" className="h-8 text-xs" onClick={closeAllTasks} disabled={closingTasks}>
              {closingTasks ? "Closing…" : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const TaskCard = ({ task, taskTime, taskHistory, projectId }: any) => {
  const today = new Date().toISOString().split("T")[0]

  useEffect(() => {
    if (task.estimated_hours > 0 && taskTime > task.estimated_hours) {
      toast.warning(`"${task.subject}" exceeded estimate (${taskTime}h / ${task.estimated_hours}h)`, {
        id: `task-${task.id}-over-budget`,
        description: "Consider re-estimating or discussing with the team.",
      })
    }
  }, [taskTime, task.estimated_hours])

  useEffect(() => {
    if (taskTime > 0 && ["New", "Assigned"].includes(task.status?.name)) {
      toast.warning(`Task "${task.subject}" has ${taskTime}h logged but is still "${task.status?.name}"`, {
        id: `task-${task.id}-stale-status`,
        description: "Update the task status to In Progress.",
      })
    }
  }, [taskTime, task.status?.name])

  useEffect(() => {
    if (task.due_date && task.due_date < today && !["Completed", "Closed"].includes(task.status?.name)) {
      toast.error(`Task "${task.subject}" is past due (${task.due_date})`, {
        id: `task-${task.id}-overdue`,
        description: "Update the due date or close this task.",
      })
    }
  }, [task.due_date, task.status?.name])

  return (
    <div className="px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-background/50 border border-border/20 space-y-1">
      {/* Title — full width, 2-line clamp */}
      <div className="text-xs font-medium leading-snug line-clamp-2">
        {task.subject}
      </div>

      {/* Status + times (left, no-wrap) · icon actions (right, always visible) */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground min-w-0 overflow-hidden">
          <span className={`px-1.5 py-0.5 rounded-full font-medium shrink-0 ${statusStyles[task?.status?.name]}`}>
            {task.status?.name}
          </span>
          <span className="whitespace-nowrap truncate">
            Est:{task.estimated_hours || 0}h · Sp:<span className="font-semibold text-foreground">{taskTime}h</span>
          </span>
        </div>
        <div className="flex items-center shrink-0">
          <TimeLogDialog taskHistory={taskHistory} taskId={task.id} projectId={projectId} iconOnly />
          <TaskNoteDialog taskId={task.id} iconOnly />
          <EditTaskDialog taskTime={taskTime} task={task} projectId={projectId} iconOnly />
        </div>
      </div>
    </div>
  )
}
