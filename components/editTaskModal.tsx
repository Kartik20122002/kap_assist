"use client"

import { useState } from "react"
import { IconPencil } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { TaskFormDialog } from "@/components/forms/task-form-dialog"

export default function EditTaskDialog({ task, iconOnly = false }: { task: any; taskTime?: number; projectId?: number; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      {iconOnly ? (
        <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => setOpen(true)} aria-label="Edit task">
          <IconPencil />
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <IconPencil /> Edit
        </Button>
      )}
      <TaskFormDialog mode="edit" task={task} open={open} onOpenChange={setOpen} />
    </>
  )
}
