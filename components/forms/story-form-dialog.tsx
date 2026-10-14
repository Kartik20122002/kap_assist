"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Kbd } from "@/components/ui/kbd"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { FormField } from "./form-field"
import { FeaturePicker, lastFeatureId, rememberFeature } from "./feature-picker"
import { MemberSelect } from "./member-select"
import { createIssue, updateIssue } from "@/lib/api/issue"
import { refreshSprintData } from "@/lib/refresh"
import { defaultEndDate, todayLocal } from "@/lib/date"
import { useUser } from "@/hooks/use-kap"
import { mutate } from "swr"

const POINTS = ["1", "2", "3", "5", "8", "13"]
const HOURS_PER_POINT = 4.5

const cf = (issue: any, id: number) => issue?.custom_fields?.find((f: any) => f.id === id)?.value ?? ""

type Props = {
  mode: "create" | "edit"
  projectId: number
  story?: any
  // Sprint context: required dates and, on create, the sprint the story goes into.
  sprintId?: number | string | null
  defaultAssigneeId?: number
  defaultFeatureId?: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

// One form for every user story create/edit (sprint and backlog).
// Rules: docs/user_story_rules.md; feature (parent) is always required.
export function StoryFormDialog(props: Props) {
  const { open, onOpenChange } = props
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[min(64rem,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        {/* Remounts on every open, so the form always starts from the saved story */}
        {open && <StoryForm {...props} key={props.story?.id ?? "new"} />}
      </DialogContent>
    </Dialog>
  )
}

function StoryForm({ mode, projectId, story, sprintId, defaultAssigneeId, defaultFeatureId, onOpenChange }: Props) {
  const { data: user } = useUser()
  const inSprint = mode === "create" ? !!sprintId : !!story?.fixed_version?.id

  const [subject, setSubject] = useState<string>(story?.subject ?? "")
  const [description, setDescription] = useState<string>(story?.description ?? "")
  const [acceptance, setAcceptance] = useState<string>(cf(story, 72))
  const [points, setPoints] = useState<string>(story?.rb_story_points ? String(story.rb_story_points) : cf(story, 5))
  const [estimate, setEstimate] = useState<string>(
    story?.estimated_hours != null ? String(story.estimated_hours) : points ? String(Number(points) * HOURS_PER_POINT) : ""
  )
  const [featureId, setFeatureId] = useState<number | null>(story?.parent?.id ?? defaultFeatureId ?? (mode === "create" ? lastFeatureId() : null))
  const [assigneeId, setAssigneeId] = useState<string>(
    String(story?.assigned_to?.id ?? defaultAssigneeId ?? user?.id ?? "")
  )
  const [approverId, setApproverId] = useState<string>(cf(story, 45) || String(user?.id ?? ""))
  const [startDate, setStartDate] = useState<string>(
    story?.start_date || cf(story, 43) || (mode === "create" && inSprint ? todayLocal() : "")
  )
  const [endDate, setEndDate] = useState<string>(story?.due_date || cf(story, 44) || "")
  const [showErrors, setShowErrors] = useState(false)
  const [saving, setSaving] = useState(false)

  const effectiveEnd = endDate || (startDate ? defaultEndDate(startDate) : "")

  const errors: Record<string, string> = {}
  if (!subject.trim()) errors.subject = "Required"
  if (!featureId) errors.feature = "Every story needs a feature"
  if (!description.trim()) errors.description = "Required"
  if (!acceptance.trim()) errors.acceptance = "Required"
  if (!points) errors.points = "Pick story points"
  if (!(Number(estimate) > 0)) errors.estimate = "Must be more than 0"
  if (!assigneeId) errors.assignee = "Required"
  if (!approverId) errors.approver = "Required"
  if (inSprint && !startDate) errors.start = "Required in a sprint"
  if (startDate && effectiveEnd && effectiveEnd < startDate) errors.end = "Can't be before start"
  const err = (k: string) => (showErrors ? errors[k] : undefined)

  const changePoints = (v: string) => {
    setPoints(v)
    setEstimate(String(Number(v) * HOURS_PER_POINT))
  }

  const submit = async () => {
    if (Object.keys(errors).length) {
      setShowErrors(true)
      toast.error("Fill the highlighted fields")
      return
    }
    const pts = Number(points)
    const est = Number(estimate)
    const spent = Number(story?.spent_hours ?? 0)

    const issue: any = {
      subject: subject.trim(),
      description,
      assigned_to_id: Number(assigneeId),
      parent_issue_id: featureId,
      estimated_hours: est,
      remaining_hours: Math.max(0, est - spent),
      rb_story_points: pts,
      custom_fields: [
        { id: 72, value: acceptance },
        { id: 5, value: String(pts) },
        { id: 8, value: String(pts) },
        { id: 45, value: approverId },
        { id: 780, value: "NA" },
        { id: 781, value: "NA" },
      ],
    }
    if (startDate) {
      issue.start_date = startDate
      issue.due_date = effectiveEnd
      if (inSprint) issue.custom_fields.push({ id: 43, value: startDate }, { id: 44, value: effectiveEnd })
    }
    if (mode === "create") {
      Object.assign(issue, { project_id: projectId, tracker_id: 5, status_id: 1, priority_id: 2 })
      if (sprintId) issue.fixed_version_id = Number(sprintId)
    }

    setSaving(true)
    try {
      if (mode === "create") await createIssue(issue)
      else await updateIssue(story.id, issue)
      if (featureId) rememberFeature(featureId)
      toast.success(mode === "create" ? "Story created" : `#${story.id} saved`)
      await Promise.all([
        refreshSprintData(),
        mutate((key: any) => Array.isArray(key) && key[0] === "backlogStories"),
      ])
      onOpenChange(false)
    } catch (e: any) {
      toast.error(mode === "create" ? "Couldn't create story" : "Couldn't save story", { description: e?.message })
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
        <DialogTitle className="text-sm">
          {mode === "create" ? "New user story" : `Edit story #${story.id}`}
        </DialogTitle>
        <DialogDescription>
          {inSprint ? "In this sprint" : "Backlog"} · fields marked * are required by KAP
        </DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 md:grid-cols-[minmax(0,1fr)_18rem]">
        {/* Content */}
        <div className="flex min-w-0 flex-col gap-4">
          <FormField label="Subject" required hint={err("subject")}>
            <Input
              autoFocus={mode === "create"}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="As a developer, I want … so that …"
              className="h-9 text-sm"
              aria-invalid={!!err("subject") || undefined}
            />
          </FormField>
          <FormField label="Description" required hint={err("description")}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs to be done and why"
              className="min-h-28 text-xs"
              aria-invalid={!!err("description") || undefined}
            />
          </FormField>
          <FormField label="Acceptance criteria" required hint={err("acceptance")}>
            <Textarea
              value={acceptance}
              onChange={(e) => setAcceptance(e.target.value)}
              placeholder={"- Criterion one\n- Criterion two"}
              className="min-h-28 text-xs"
              aria-invalid={!!err("acceptance") || undefined}
            />
          </FormField>
        </div>

        {/* Properties */}
        <div className="flex flex-col gap-4 rounded-lg bg-muted/40 p-3.5">
          <FormField label="Feature" required hint={err("feature")}>
            <FeaturePicker projectId={projectId} value={featureId} onChange={setFeatureId} invalid={!!err("feature")} />
          </FormField>

          <FormField label="Story points" required hint={err("points") ?? `Estimate = points × ${HOURS_PER_POINT}h`}>
            <ToggleGroup
              value={points ? [points] : []}
              onValueChange={(v: string[]) => v[0] && changePoints(v[0])}
              variant="outline"
              size="sm"
              spacing={0}
              className="w-full"
            >
              {POINTS.map((p) => (
                <ToggleGroupItem key={p} value={p} className="flex-1 tabular-nums">
                  {p}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </FormField>

          <FormField label="Estimated hours" required hint={err("estimate")}>
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

          <FormField label="Assignee" required hint={err("assignee")}>
            <MemberSelect
              projectId={projectId}
              value={assigneeId}
              onChange={setAssigneeId}
              fallbackName={story?.assigned_to?.name}
              invalid={!!err("assignee")}
            />
          </FormField>

          <FormField label="Approved by" required hint={err("approver")}>
            <MemberSelect projectId={projectId} value={approverId} onChange={setApproverId} invalid={!!err("approver")} />
          </FormField>

          <div className="grid grid-cols-2 gap-2">
            <FormField label="Start" required={inSprint} hint={err("start")}>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-xs"
                aria-invalid={!!err("start") || undefined}
              />
            </FormField>
            <FormField label="End" hint={err("end") ?? (!endDate && startDate ? "Auto: start + 7d" : undefined)}>
              <Input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder={effectiveEnd}
                className="h-8 text-xs"
                aria-invalid={!!err("end") || undefined}
              />
            </FormField>
          </div>
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
          {saving ? "Saving…" : mode === "create" ? "Create story" : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  )
}
