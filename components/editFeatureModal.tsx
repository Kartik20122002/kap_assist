"use client"

import { useState } from "react"
import { IconPencil } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { FeatureFormDialog } from "@/components/forms/feature-form-dialog"

export default function EditFeatureModal({ feature, iconOnly = false }: { feature: any; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      {iconOnly ? (
        <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => setOpen(true)} aria-label="Edit feature">
          <IconPencil />
        </Button>
      ) : (
        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => setOpen(true)}>
          <IconPencil /> Edit
        </Button>
      )}
      <FeatureFormDialog mode="edit" projectId={feature.project?.id} feature={feature} open={open} onOpenChange={setOpen} />
    </>
  )
}
