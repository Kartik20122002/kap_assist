"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { IconClock } from "@tabler/icons-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormField } from "@/components/forms/form-field"
import { createTimeEntry, getIssueTimeEntries } from "@/lib/api/time"
import { extractError } from "@/lib/workflow"
import { refreshTimeData } from "@/lib/refresh"
import { formatShortDate, todayLocal, weekdayShort } from "@/lib/date"
import { CATEGORIES, CATEGORY_TYPE, HOUR_PRESETS, taskCategory } from "@/lib/time"

type Props = {
  taskId: number
  task?: any
  taskHistory?: any[]
  projectId?: number
  iconOnly?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
}

// Log time on a task and see its full history (everyone's entries), grouped by day.
export default function TimeLogDialog({ taskId, task, taskHistory, iconOnly = false, open: openProp, onOpenChange, hideTrigger = false }: Props) {
  const [innerOpen, setInnerOpen] = useState(false)
  const open = openProp ?? innerOpen
  const setOpen = onOpenChange ?? setInnerOpen

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger
          render={
            iconOnly ? (
              <Button size="icon-sm" variant="ghost" className="text-muted-foreground hover:text-foreground" aria-label="Time log" />
            ) : (
              <Button size="sm" variant="outline" />
            )
          }
        >
          <IconClock />
          {!iconOnly && "Time log"}
        </DialogTrigger>
      )}
      <DialogContent className="flex max-h-[92vh] w-[min(52rem,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        {open && <TimeLogBody taskId={taskId} task={task} taskHistory={taskHistory} />}
      </DialogContent>
    </Dialog>
  )
}

function TimeLogBody({ taskId, task, taskHistory }: { taskId: number; task?: any; taskHistory?: any[] }) {
  const defaultCategory = task ? taskCategory(task) : "CODING"
  const [hours, setHours] = useState("1")
  const [date, setDate] = useState(todayLocal())
  const [category, setCategory] = useState(defaultCategory)
  const [comment, setComment] = useState("")
  const [saving, setSaving] = useState(false)

  const { data: fetched } = useSWR(!taskHistory ? ["time_entries", "issue", taskId] : null, () => getIssueTimeEntries(taskId))
  const history: any[] = useMemo(() => taskHistory ?? fetched ?? [], [taskHistory, fetched])

  const days = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const e of [...history].sort((a, b) => String(b.spent_on).localeCompare(String(a.spent_on)))) {
      map.set(e.spent_on, [...(map.get(e.spent_on) ?? []), e])
    }
    return [...map.entries()]
  }, [history])
  const total = history.reduce((s, e) => s + Number(e.hours ?? 0), 0)

  const submit = async () => {
    const h = Number(hours)
    if (!h || h <= 0) {
      toast.error("Enter hours greater than 0")
      return
    }
    setSaving(true)
    try {
      await createTimeEntry(taskId, date, h, comment, category, CATEGORY_TYPE[category])
      toast.success(`${h}h logged on #${taskId}`)
      setComment("")
      await refreshTimeData()
    } catch (err) {
      toast.error("Couldn't log time", { description: extractError(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <DialogHeader className="shrink-0 border-b px-5 py-3.5">
        <DialogTitle className="text-sm">Time log · #{taskId}</DialogTitle>
        {task?.subject && <DialogDescription className="truncate">{task.subject}</DialogDescription>}
      </DialogHeader>

      <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[18rem_minmax(0,1fr)] md:overflow-hidden">
        {/* Log form */}
        <form
          className="flex flex-col gap-3.5 border-b p-5 md:border-r md:border-b-0"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <FormField label="Hours" required>
            <ToggleGroup
              value={HOUR_PRESETS.includes(hours) ? [hours] : []}
              onValueChange={(v: string[]) => v[0] && setHours(v[0])}
              variant="outline"
              size="sm"
              spacing={0}
              className="w-full"
            >
              {HOUR_PRESETS.map((p) => (
                <ToggleGroupItem key={p} value={p} className="flex-1 px-0 tabular-nums">
                  {p}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Input type="number" min="0" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} className="h-8 text-xs" />
          </FormField>
          <FormField label="Date" required>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 text-xs" />
          </FormField>
          <FormField label="Category" hint={`Type: ${CATEGORY_TYPE[category]}`}>
            <Select value={category} onValueChange={(v) => v && setCategory(String(v))}>
              <SelectTrigger className="h-8 w-full text-xs">
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
          </FormField>
          <FormField label="Comment">
            <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional" className="h-8 text-xs" />
          </FormField>
          <Button type="submit" disabled={saving} className="mt-1">
            {saving ? "Logging…" : `Log ${hours || 0}h`}
          </Button>
        </form>

        {/* History */}
        <div className="flex min-h-0 flex-col md:overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <span className="text-[11px] font-medium text-muted-foreground">History</span>
            <span className="text-xs tabular-nums">
              Total <span className="font-semibold">{total}h</span>
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-5">
            {days.length === 0 && <div className="py-8 text-center text-xs text-muted-foreground">No time logged yet</div>}
            {days.map(([day, entries]) => (
              <div key={day} className="border-b py-2.5 last:border-b-0">
                <div className="mb-1.5 flex items-baseline justify-between text-xs">
                  <span className="font-medium">
                    {weekdayShort(day)} {formatShortDate(day)}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {entries.reduce((s, e) => s + Number(e.hours ?? 0), 0)}h
                  </span>
                </div>
                {entries.map((e) => (
                  <div key={e.id} className="flex items-start gap-3 py-1 text-xs">
                    <span className="w-10 shrink-0 font-semibold tabular-nums">{e.hours}h</span>
                    <span className="min-w-0 flex-1">
                      <span className="text-muted-foreground">
                        {e.user?.name} · {e.custom_fields?.find((f: any) => f.id === 46)?.value}
                      </span>
                      {e.comments && <span className="block line-clamp-2">{e.comments}</span>}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
