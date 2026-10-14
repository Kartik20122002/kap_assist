"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { IconPaperclip, IconX } from "@tabler/icons-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Kbd } from "@/components/ui/kbd"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormField } from "./form-field"
import { createIssue, updateIssue } from "@/lib/api/issue"
import { refreshSprintData } from "@/lib/refresh"
import { defaultEndDate, todayLocal } from "@/lib/date"
import { CATEGORIES, CATEGORY_TYPE, taskCategory } from "@/lib/time"

type Props = {
  mode: "create" | "edit"
  task?: any
  // create: the parent story the task belongs to
  parent?: { id: number; projectId: number; assigneeId?: number; subject?: string }
  open: boolean
  onOpenChange: (open: boolean) => void
}

// One form for task create/edit. Rules: docs/task_rules.md.
// Status is changed inline (Status Jump), so it is not part of this form.
export function TaskFormDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[min(52rem,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        {props.open && <TaskForm {...props} key={props.task?.id ?? "new"} />}
      </DialogContent>
    </Dialog>
  )
}

function TaskForm({ mode, task, parent, onOpenChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [subject, setSubject] = useState<string>(task?.subject ?? "")
  const [description, setDescription] = useState<string>(task?.description ?? "")
  const [category, setCategory] = useState<string>(task ? taskCategory(task) : "CODING")
  const [estimate, setEstimate] = useState<string>(task?.estimated_hours != null ? String(task.estimated_hours) : "")
  const [startDate, setStartDate] = useState<string>(task?.start_date ?? todayLocal())
  const [endDate, setEndDate] = useState<string>(task?.due_date ?? "")
  const [files, setFiles] = useState<{ file: File; description: string }[]>([])
  const [showErrors, setShowErrors] = useState(false)
  const [saving, setSaving] = useState(false)

  const spent = Number(task?.spent_hours ?? 0)
  const effectiveEnd = endDate || (startDate ? defaultEndDate(startDate) : "")
  const remaining = Math.max(0, Number(estimate || 0) - spent)

  const errors: Record<string, string> = {}
  if (!subject.trim()) errors.subject = "Required"
  if (estimate === "" || Number(estimate) < 0) errors.estimate = "0 or more"
  if (!startDate) errors.start = "Required"
  if (startDate && effectiveEnd < startDate) errors.end = "Can't be before start"
  const err = (k: string) => (showErrors ? errors[k] : undefined)

  const submit = async () => {
    if (Object.keys(errors).length) {
      setShowErrors(true)
      toast.error("Fill the highlighted fields")
      return
    }
    const est = Number(estimate)
    const issue: any = {
      subject: subject.trim(),
      description,
      estimated_hours: est,
      remaining_hours: remaining,
      start_date: startDate,
      due_date: effectiveEnd,
      custom_fields: [
        { id: 13, value: category },
        { id: 14, value: CATEGORY_TYPE[category] },
        { id: 15, value: String(remaining) },
        { id: 43, value: startDate },
        { id: 44, value: effectiveEnd },
      ],
    }
    if (mode === "create" && parent) {
      Object.assign(issue, {
        tracker_id: 6,
        status_id: 1,
        project_id: parent.projectId,
        parent_issue_id: parent.id,
        assigned_to_id: parent.assigneeId,
      })
    }

    setSaving(true)
    try {
      if (mode === "create") await createIssue(issue, files)
      else await updateIssue(task.id, issue, files)
      toast.success(mode === "create" ? "Task created" : `#${task.id} saved`)
      await refreshSprintData()
      onOpenChange(false)
    } catch (e: any) {
      toast.error(mode === "create" ? "Couldn't create task" : "Couldn't save task", { description: e?.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          submit()
        }
      }}
    >
      <DialogHeader className="shrink-0 border-b px-5 py-3.5">
        <DialogTitle className="text-sm">{mode === "create" ? "New task" : `Edit task #${task.id}`}</DialogTitle>
        <DialogDescription className="truncate">
          {mode === "create" ? `In #${parent?.id} ${parent?.subject ?? ""}` : task?.parent?.id ? `In story #${task.parent.id}` : ""}
        </DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        <FormField label="Subject" required hint={err("subject")}>
          <Input
            autoFocus={mode === "create"}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What will be done"
            className="h-9 text-sm"
            aria-invalid={!!err("subject") || undefined}
          />
        </FormField>

        <FormField label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-24 text-xs" />
        </FormField>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <FormField label="Category" required hint={`Type: ${CATEGORY_TYPE[category]}`} className="col-span-2 md:col-span-1">
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
          <FormField label="Estimate (h)" required hint={err("estimate") ?? `Remaining ${remaining}h`} className="col-span-2 md:col-span-1">
            <Input
              type="number"
              min="0"
              step="0.5"
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
              className="h-8 text-xs"
              aria-invalid={!!err("estimate") || undefined}
            />
          </FormField>
          <FormField label="Start" required hint={err("start")}>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 text-xs"
              aria-invalid={!!err("start") || undefined}
            />
          </FormField>
          <FormField label="End" hint={err("end") ?? (!endDate ? "Auto: start + 7d" : undefined)}>
            <Input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 text-xs"
              aria-invalid={!!err("end") || undefined}
            />
          </FormField>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Attachments</span>
            <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              <IconPaperclip /> Add files
            </Button>
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? [])
                setFiles((prev) => [...prev, ...picked.map((f) => ({ file: f, description: f.name }))])
                e.target.value = ""
              }}
            />
          </div>
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border px-2 py-1.5">
              <IconPaperclip className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="max-w-40 min-w-0 shrink truncate text-[11px]">{f.file.name}</span>
              <Input
                value={f.description}
                onChange={(e) => setFiles((prev) => prev.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                placeholder="Description"
                className="h-7 flex-1 text-[11px]"
              />
              <Button type="button" size="icon-sm" variant="ghost" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                <IconX />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <DialogFooter className="shrink-0 items-center border-t px-5 py-3">
        <span className="mr-auto hidden text-[11px] text-muted-foreground sm:inline">
          <Kbd>Ctrl</Kbd> <Kbd>Enter</Kbd> to save
        </span>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : mode === "create" ? "Create task" : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  )
}
