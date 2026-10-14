"use client"

import { useState } from "react"
import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { TaskFormDialog } from "@/components/forms/task-form-dialog"

export default function CreateTaskDialog({
  parent_issue_id,
  project_id,
  assigned_to_id,
  parentSubject,
  iconOnly = false,
}: {
  parent_issue_id: number
  project_id: number
  assigned_to_id?: number
  parentSubject?: string
  iconOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      {iconOnly ? (
        <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => setOpen(true)} aria-label="Add task">
          <IconPlus />
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <IconPlus /> Add task
        </Button>
      )}
      <TaskFormDialog
        mode="create"
        parent={{ id: parent_issue_id, projectId: project_id, assigneeId: assigned_to_id, subject: parentSubject }}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
