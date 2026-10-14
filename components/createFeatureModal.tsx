"use client"

import { useState } from "react"
import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { FeatureFormDialog } from "@/components/forms/feature-form-dialog"

export default function CreateFeatureModal({ projectId }: { projectId: number }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <IconPlus /> New feature
      </Button>
      <FeatureFormDialog mode="create" projectId={projectId} open={open} onOpenChange={setOpen} />
    </>
  )
}
