"use client"

import { useState } from "react"
import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { StoryFormDialog } from "@/components/forms/story-form-dialog"

// "New story" in a sprint
export default function CreateStoryDialog({ projectId, sprintId, assignedToId }: { projectId: number; sprintId: any; assignedToId?: number }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <IconPlus /> New story
      </Button>
      <StoryFormDialog
        mode="create"
        projectId={projectId}
        sprintId={sprintId}
        defaultAssigneeId={assignedToId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
