"use client"

import { useState } from "react"
import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { StoryFormDialog } from "@/components/forms/story-form-dialog"

// "New story" in the backlog (no sprint, dates optional)
export default function BacklogCreateStoryModal({ projectId }: { projectId: number }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <IconPlus /> New story
      </Button>
      <StoryFormDialog mode="create" projectId={projectId} open={open} onOpenChange={setOpen} />
    </>
  )
}
