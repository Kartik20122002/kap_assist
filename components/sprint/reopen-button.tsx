"use client"

import { useState } from "react"
import { toast } from "sonner"
import { IconRotateClockwise } from "@tabler/icons-react"
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { reopenIssue } from "@/lib/workflow"
import { refreshSprintData } from "@/lib/refresh"

// L2: closed stories get an explicit Reopen action (Closed → Reopened) instead of a dropdown.
export function ReopenButton({ issue }: { issue: any }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!reason.trim()) return
    setSaving(true)
    try {
      await reopenIssue(issue, reason.trim())
      toast.success(`#${issue.id} reopened`)
      setOpen(false)
      setReason("")
      await refreshSprintData()
    } catch (err: any) {
      toast.error(`Couldn't reopen #${issue.id}`, { description: err?.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button size="sm" variant="outline" className="h-6 gap-1 rounded-full px-2 text-[11px]" />}>
        <IconRotateClockwise className="size-3" />
        Reopen
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Reopen #{issue.id}</PopoverTitle>
          <PopoverDescription>It moves to Reopened, then continues from Assigned.</PopoverDescription>
        </PopoverHeader>
        <Textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit()
          }}
          placeholder="Reason for going back (required)"
          className="min-h-20 text-xs"
        />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={!reason.trim() || saving}>
            {saving ? "Reopening…" : "Reopen"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
