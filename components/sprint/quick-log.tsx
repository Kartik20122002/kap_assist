"use client"

import { useState } from "react"
import { toast } from "sonner"
import { IconClockPlus } from "@tabler/icons-react"
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { createTimeEntry } from "@/lib/api/time"
import { extractError } from "@/lib/workflow"
import { refreshTimeData } from "@/lib/refresh"
import { todayLocal } from "@/lib/date"
import { CATEGORY_TYPE, CATEGORIES, HOUR_PRESETS, taskCategory } from "@/lib/time"

// Log time on a task without leaving the list: pick hours, hit Log.
export function QuickLog({ task, onOpenHistory }: { task: any; onOpenHistory?: () => void }) {
  const defaultCategory = taskCategory(task)

  const [open, setOpen] = useState(false)
  const [hours, setHours] = useState("1")
  const [date, setDate] = useState(todayLocal())
  const [category, setCategory] = useState(defaultCategory)
  const [comment, setComment] = useState("")
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setHours("1")
    setDate(todayLocal())
    setCategory(defaultCategory)
    setComment("")
  }

  const submit = async () => {
    const h = Number(hours)
    if (!h || h <= 0) {
      toast.error("Enter hours greater than 0")
      return
    }
    setSaving(true)
    try {
      await createTimeEntry(task.id, date, h, comment, category, CATEGORY_TYPE[category])
      toast.success(`${h}h logged on #${task.id}`, { description: date === todayLocal() ? "Today" : date })
      setOpen(false)
      reset()
      await refreshTimeData()
    } catch (err) {
      toast.error(`Couldn't log time on #${task.id}`, { description: extractError(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setDate(todayLocal())
      }}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={<Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground" aria-label="Log time" />}
            />
          }
        >
          <IconClockPlus />
          <span className="hidden sm:inline">Log</span>
        </TooltipTrigger>
        <TooltipContent>Log time</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Log time · #{task.id}</PopoverTitle>
        </PopoverHeader>

        <div className="space-y-1.5">
          <ToggleGroup
            value={HOUR_PRESETS.includes(hours) ? [hours] : []}
            onValueChange={(v: string[]) => v[0] && setHours(v[0])}
            variant="outline"
            size="sm"
            spacing={1}
            className="w-full"
          >
            {HOUR_PRESETS.map((p) => (
              <ToggleGroupItem key={p} value={p} className="flex-1 tabular-nums">
                {p}h
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              step="0.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="h-7 w-20 text-xs"
              aria-label="Hours"
            />
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-7 flex-1 text-xs" aria-label="Date" />
          </div>
          <Select value={category} onValueChange={(v) => v && setCategory(v as string)}>
            <SelectTrigger className="h-7 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Comment (optional)"
            className="h-7 text-xs"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          {onOpenHistory ? (
            <Button
              size="sm"
              variant="link"
              className="px-0"
              onClick={() => {
                setOpen(false)
                onOpenHistory()
              }}
            >
              History
            </Button>
          ) : (
            <span />
          )}
          <Button size="sm" onClick={submit} disabled={saving}>
            {saving ? "Logging…" : `Log ${hours || 0}h`}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
