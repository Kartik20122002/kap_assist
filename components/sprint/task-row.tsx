"use client"

import { useState } from "react"
import { IconHistory } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import TaskNoteDialog from "@/components/tasknoteModal"
import TimeLogDialog from "@/components/timelogModal"
import { TaskFormDialog } from "@/components/forms/task-form-dialog"
import { StatusMenu } from "./status-menu"
import { QuickLog } from "./quick-log"
import { HealthMarker } from "./health-marker"
import type { HealthItem } from "@/lib/health"
import { taskSpent } from "@/lib/health"
import { STATUS } from "@/lib/workflow"
import { IconNotes, IconPencil } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

export function TaskRow({ task, health }: { task: any; health: HealthItem[] }) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const spent = taskSpent(task)
  const est = Number(task.estimated_hours ?? 0)
  const closed = task.status?.id === STATUS.CLOSED

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50",
        closed && "opacity-60"
      )}
    >
      <div className="w-32 shrink-0">
        <StatusMenu issue={task} canEdit />
      </div>

      <span className="min-w-0 flex-1 basis-60 text-[13px] leading-snug">
        <span className="mr-1.5 text-[11px] text-muted-foreground tabular-nums">#{task.id}</span>
        {task.subject}
      </span>

      <HealthMarker items={health} />

      <span
        className={cn(
          "w-20 text-right text-xs whitespace-nowrap text-muted-foreground tabular-nums",
          est > 0 && spent > est && "text-amber-600 dark:text-amber-400"
        )}
        title="Spent / estimated"
      >
        <span className="font-medium text-foreground">{spent}h</span> / {est}h
      </span>

      <div className="ml-auto flex items-center gap-0.5 sm:ml-0">
        <QuickLog task={task} onOpenHistory={() => setHistoryOpen(true)} />
        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => setHistoryOpen(true)} aria-label="Time history">
          <IconHistory />
          <span className="hidden xl:inline">History</span>
        </Button>
        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => setNoteOpen(true)} aria-label="Add note">
          <IconNotes />
          <span className="hidden xl:inline">Note</span>
        </Button>
        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => setEditOpen(true)} aria-label="Edit task">
          <IconPencil />
          <span className="hidden xl:inline">Edit</span>
        </Button>
      </div>

      <TimeLogDialog taskId={task.id} task={task} open={historyOpen} onOpenChange={setHistoryOpen} hideTrigger />
      <TaskNoteDialog taskId={task.id} open={noteOpen} onOpenChange={setNoteOpen} hideTrigger />
      <TaskFormDialog mode="edit" task={task} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  )
}
