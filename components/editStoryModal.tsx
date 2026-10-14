"use client"

import { useState } from "react"
import { IconPencil } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { StoryFormDialog } from "@/components/forms/story-form-dialog"

export default function EditStoryDialog({ story, iconOnly = false }: { story: any; sprintId?: any; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      {iconOnly ? (
        <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => setOpen(true)} aria-label="Edit story">
          <IconPencil />
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <IconPencil /> Edit
        </Button>
      )}
      <StoryFormDialog mode="edit" projectId={story.project?.id} story={story} open={open} onOpenChange={setOpen} />
    </>
  )
}
