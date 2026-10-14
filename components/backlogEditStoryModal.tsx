"use client"

import { useState } from "react"
import { IconPencil } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { StoryFormDialog } from "@/components/forms/story-form-dialog"

export default function BacklogEditStoryModal({ story }: { story: any }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <IconPencil /> Edit
      </Button>
      <StoryFormDialog mode="edit" projectId={story.project?.id} story={story} open={open} onOpenChange={setOpen} />
    </>
  )
}
