"use client"

import { useState } from "react"
import { toast } from "sonner"
import { IconLayoutList, IconAlertTriangle } from "@tabler/icons-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { FeatureCommand, rememberFeature, useFeatures } from "@/components/forms/feature-picker"
import { updateIssue } from "@/lib/api/issue"
import { refreshSprintData } from "@/lib/refresh"
import { cn } from "@/lib/utils"

// Shows the story's feature; admins can (re)assign it in place. Missing = amber.
export function FeatureChip({ story, canEdit }: { story: any; canEdit: boolean }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const projectId = story.project?.id
  const { data } = useFeatures(projectId)
  const featureId = story.parent?.id
  const feature = (data?.issues ?? []).find((f: any) => f.id === featureId)
  const label = feature?.subject ?? (featureId ? `Feature #${featureId}` : "Set feature")

  const assign = async (f: any) => {
    setOpen(false)
    if (f.id === featureId) return
    setSaving(true)
    try {
      await updateIssue(story.id, { parent_issue_id: f.id })
      rememberFeature(f.id)
      toast.success(`#${story.id} → ${f.subject}`)
      await refreshSprintData()
    } catch (e: any) {
      toast.error("Couldn't set feature", { description: e?.message })
    } finally {
      setSaving(false)
    }
  }

  const chip = (
    <>
      {featureId ? <IconLayoutList className="opacity-60" /> : <IconAlertTriangle />}
      <span className="max-w-56 truncate">{saving ? "Saving…" : label}</span>
    </>
  )
  const chipClass = cn(
    "h-6 max-w-64 gap-1 rounded-full px-2 text-[11px] font-normal",
    !featureId && "border-amber-500/50 text-amber-700 dark:text-amber-400"
  )

  if (!canEdit) {
    return (
      <span className={cn("inline-flex items-center border border-border", chipClass, "[&_svg]:size-3")} title={label}>
        {chip}
      </span>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="sm" className={chipClass} title={label} disabled={saving} />}>
        {chip}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 gap-0 p-0">
        <FeatureCommand projectId={projectId} value={featureId} onSelect={assign} />
      </PopoverContent>
    </Popover>
  )
}
