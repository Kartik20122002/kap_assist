"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useSWR from "swr"
import { getTasks } from "@/lib/api/task"
import { getTimeEntries } from "@/lib/api/time"
import TimeLogDialog from "./timelogModal"
import TaskNoteDialog from "./tasknoteModal"
import { ApiConfig, statusStyles } from "@/lib/utils"
import EditTaskDialog from "./editTaskModal"
import CreateTaskDialog from "./addTaskModel"

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

  return (
    <Card className="bg-muted/40 transition">
      <CardContent className="p-3 space-y-2">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="text-sm font-medium line-clamp-1">
            {story.subject}
          </div>

          <div className="flex items-center gap-4">
            <CreateTaskDialog parent_issue_id ={story?.id} project_id={story?.project?.id} assigned_to_id={story.assigned_to?.id} />

            <Button size="sm" variant="default" className="h-6 text-[10px] px-2">
              Update
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-4 gap-x-2 gap-y-1 text-xs">

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
  return (
    <div
      key={task.id}
      className="flex items-center justify-between gap-3 p-2 rounded-md bg-muted/30 transition"
    >

      {/* Left */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {task.subject}
        </div>

        {/* 🔥 labeled row */}
        <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">

          <div className="flex gap-1">
            <span className="opacity-60">Status:</span>
            <span className={`px-2 rounded-full ${statusStyles[task?.status?.name]}`}>{task.status?.name}</span>
          </div>

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
      <div className="flex gap-1 shrink-0">

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