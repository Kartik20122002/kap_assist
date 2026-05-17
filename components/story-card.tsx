"use client"
import { Card, CardContent } from "@/components/ui/card"
import useSWR from "swr"
import { getTasks } from "@/lib/api/task"
import { getTimeEntries } from "@/lib/api/time"
import TimeLogDialog from "./timelogModal"
import TaskNoteDialog from "./tasknoteModal"
import { ApiConfig, statusStyles } from "@/lib/utils"
import EditTaskDialog from "./editTaskModal"
import CreateTaskDialog from "./addTaskModel"
import EditStoryDialog from "./editStoryModal"
import { useEffect } from "react"
import { toast } from "sonner"

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

  // 🔥 map: taskId -> total hours
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
  const OPEN_STATUSES = ["New", "Assigned", "In Progress", "Ready for Testing"]
  const CLOSED_STATUSES = ["Closed", "Implemented", "Rejected"]

  // A1 — Story has no tasks
  useEffect(() => {
    if (tasks !== undefined && tasks.length === 0) {
      toast.warning(`No tasks yet for "${story.subject}"`, {
        id: `story-${story.id}-no-tasks`,
        description: "Add at least one task so work can be tracked and time logged.",
      })
    }
  }, [tasks])

  // A2 — Story has logged time but status is still New / Assigned
  useEffect(() => {
    if (storyTime > 0 && ["New", "Assigned"].includes(story.status?.name)) {
      toast.warning(`"${story.subject}" has ${storyTime}h logged but is still "${story.status?.name}"`, {
        id: `story-${story.id}-stale-status`,
        description: "Consider moving this story to In Progress.",
      })
    }
  }, [storyTime, story.status?.name])

  // A3 — Story is overdue
  useEffect(() => {
    if (
      story.due_date &&
      story.due_date < today &&
      !CLOSED_STATUSES.includes(story.status?.name)
    ) {
      toast.error(`"${story.subject}" is past due (${story.due_date})`, {
        id: `story-${story.id}-overdue`,
        description: "Update the due date or close this story.",
      })
    }
  }, [story.due_date, story.status?.name])

  // A10 — Story has no acceptance criteria
  useEffect(() => {
    if (!acceptance && !CLOSED_STATUSES.includes(story.status?.name)) {
      toast.warning(`"${story.subject}" has no acceptance criteria`, {
        id: `story-${story.id}-no-ac`,
        description: "Acceptance criteria are required before moving to Ready.",
      })
    }
  }, [acceptance, story.status?.name])

  return (
    <Card className="bg-muted/40 transition">
      <CardContent className="p-3 space-y-2">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
          <div className="text-base font-medium line-clamp-2 sm:line-clamp-1 min-w-0">
            {story.subject}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <span className={`px-2 rounded-full text-xs ${statusStyles[story?.status?.name]}`}>{story.status?.name}</span>
            <CreateTaskDialog parent_issue_id={story?.id} project_id={story?.project?.id} assigned_to_id={story.assigned_to?.id} />
            <EditStoryDialog story={story} sprintId={story.fixed_version?.id ?? story.fixed_version_id} />
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 text-xs">

          <div>
            <span className="opacity-60">Assigned</span>
            <div>{story.assigned_to?.name || "-"}</div>
          </div>

          <div>
            <span className="opacity-60">Author</span>
            <div>{story.author?.name}</div>
          </div>

          <div>
            <span className="opacity-60">Story Points</span>
            <div>{storyPoints}</div>
          </div>

          <div>
            <span className="opacity-60">Time</span>
            <div>{storyTime}h</div>
          </div>

        </div>

        {/* Acceptance */}
        {acceptance && (
          <div className="text-[10px] text-muted-foreground line-clamp-2">
            {acceptance}
          </div>
        )}

        {/* Tasks */}
        {tasks?.length > 0 && (
          <div className="space-y-1 pt-1">

            {tasks.map((task: any) => {
              const taskTime = timeMap[task.id] || 0
              const taskHistory =
                time_entries
                  ?.filter((t: any) => t.issue?.id === task.id)
                  ?.sort(
                    (a: any, b: any) =>
                      new Date(b.spent_on).getTime() -
                      new Date(a.spent_on).getTime()
                  ) || []

              return (<TaskCard key={`task:${task.id}`} projectId={story?.project?.id} task={task} taskTime={taskTime} taskHistory={taskHistory} />)
            })}

          </div>
        )}

      </CardContent>
    </Card>
  )
}

const TaskCard = ({ task, taskTime, taskHistory, projectId }: any) => {
  const today = new Date().toISOString().split("T")[0]

  // A4 — Task exceeded estimated hours
  useEffect(() => {
    if (task.estimated_hours > 0 && taskTime > task.estimated_hours) {
      toast.warning(`"${task.subject}" exceeded estimate (${taskTime}h / ${task.estimated_hours}h)`, {
        id: `task-${task.id}-over-budget`,
        description: "Consider re-estimating or discussing with the team.",
      })
    }
  }, [taskTime, task.estimated_hours])

  // A5 — Task has logged time but status is still New / Assigned
  useEffect(() => {
    if (taskTime > 0 && ["New", "Assigned"].includes(task.status?.name)) {
      toast.warning(`Task "${task.subject}" has ${taskTime}h logged but is still "${task.status?.name}"`, {
        id: `task-${task.id}-stale-status`,
        description: "Update the task status to In Progress.",
      })
    }
  }, [taskTime, task.status?.name])

  // A6 — Task is overdue
  useEffect(() => {
    if (
      task.due_date &&
      task.due_date < today &&
      !["Completed", "Closed"].includes(task.status?.name)
    ) {
      toast.error(`Task "${task.subject}" is past due (${task.due_date})`, {
        id: `task-${task.id}-overdue`,
        description: "Update the due date or close this task.",
      })
    }
  }, [task.due_date, task.status?.name])

  return (
    <div
      key={task.id}
      className="flex items-center justify-between gap-3 p-2 rounded-md bg-muted/30 transition"
    >

      {/* Left */}
      <div className="flex-1 min-w-0">
        <div className="text-base font-medium truncate">
          {task.subject}
        </div>

        {/* labeled row */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-0.5">

          <span className={`px-2 text-xs rounded-full h-4 ${statusStyles[task?.status?.name]}`}>{task.status?.name}</span>

          <div className="flex gap-1">
            <span className="opacity-60">Est:</span>
            <span>{task.estimated_hours || 0}h</span>
          </div>

          <div className="flex gap-1">
            <span className="opacity-60">Spent:</span>
            <span className="font-medium text-foreground">
              {taskTime}h
            </span>
          </div>

        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1 shrink-0 flex-wrap justify-end">

        <TimeLogDialog
          taskHistory={taskHistory}
          taskId={task.id}
          projectId={projectId}
        />

        <TaskNoteDialog
          taskId={task.id}
        />

        <EditTaskDialog
          taskTime={taskTime}
          task={task}
          projectId={projectId}
        />

      </div>

    </div>
  )
}