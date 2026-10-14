"use client"

import { useState } from "react"
import { toast } from "sonner"
import { mutate } from "swr"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Kbd } from "@/components/ui/kbd"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormField } from "./form-field"
import { EpicPicker } from "./feature-picker"
import { MemberSelect } from "./member-select"
import { createIssue, updateIssue } from "@/lib/api/issue"
import { defaultEndDate, todayLocal } from "@/lib/date"
import { useUser } from "@/hooks/use-kap"

export const T_SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"]
const T_SHIRT_POINTS: Record<string, number> = { XS: 1, S: 1, M: 3, L: 5, XL: 8, XXL: 13 }
const SIZE_UOMS = ["Pages", "Requirements", "Blocks", "Signals"]

const cf = (issue: any, id: number) => issue?.custom_fields?.find((f: any) => f.id === id)?.value ?? ""

type Props = {
  mode: "create" | "edit"
  projectId: number
  feature?: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const refreshFeatures = () =>
  mutate((key: any) => Array.isArray(key) && (key[0] === "features" || key[0] === "featurePage" || key[0] === "featureStories"))

// One form for feature create/edit. Status is changed inline on the list.
export function FeatureFormDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[min(64rem,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        {props.open && <FeatureForm {...props} key={props.feature?.id ?? "new"} />}
      </DialogContent>
    </Dialog>
  )
}

function FeatureForm({ mode, projectId, feature, onOpenChange }: Props) {
  const { data: user } = useUser()
  const [subject, setSubject] = useState<string>(feature?.subject ?? "")
  const [description, setDescription] = useState<string>(feature?.description ?? "")
  const [acceptance, setAcceptance] = useState<string>(cf(feature, 72))
  const [epicId, setEpicId] = useState<number | null>(feature?.parent?.id ?? null)
  const [size, setSize] = useState<string>(cf(feature, 4) || "M")
  const [uom, setUom] = useState<string>(cf(feature, 6) || "Pages")
  const [assigneeId, setAssigneeId] = useState<string>(String(feature?.assigned_to?.id ?? user?.id ?? ""))
  const [approverId, setApproverId] = useState<string>(cf(feature, 45) || String(user?.id ?? ""))
  const [startDate, setStartDate] = useState<string>(feature?.start_date || cf(feature, 43) || todayLocal())
  const [endDate, setEndDate] = useState<string>(feature?.due_date || cf(feature, 44) || "")
  const [showErrors, setShowErrors] = useState(false)
  const [saving, setSaving] = useState(false)

  const effectiveEnd = endDate || (startDate ? defaultEndDate(startDate) : "")

  const errors: Record<string, string> = {}
  if (!subject.trim()) errors.subject = "Required"
  if (!epicId) errors.epic = "Every feature needs an epic"
  if (!description.trim()) errors.description = "Required"
  if (!acceptance.trim()) errors.acceptance = "Required"
  if (!assigneeId) errors.assignee = "Required"
  if (!approverId) errors.approver = "Required"
  if (!startDate) errors.start = "Required"
  if (startDate && effectiveEnd < startDate) errors.end = "Can't be before start"
  const err = (k: string) => (showErrors ? errors[k] : undefined)

  const submit = async () => {
    if (Object.keys(errors).length) {
      setShowErrors(true)
      toast.error("Fill the highlighted fields")
      return
    }
    const points = String(T_SHIRT_POINTS[size] ?? 1)
    const issue: any = {
      subject: subject.trim(),
      description,
      assigned_to_id: Number(assigneeId),
      parent_issue_id: epicId,
      start_date: startDate,
      due_date: effectiveEnd,
      custom_fields: [
        { id: 72, value: acceptance },
        { id: 4, value: size },
        { id: 5, value: points },
        { id: 8, value: points },
        { id: 6, value: uom },
        { id: 43, value: startDate },
        { id: 44, value: effectiveEnd },
        { id: 45, value: approverId },
      ],
    }
    if (mode === "create") Object.assign(issue, { project_id: projectId, tracker_id: 2, status_id: 1, priority_id: 2 })

    setSaving(true)
    try {
      if (mode === "create") await createIssue(issue)
      else await updateIssue(feature.id, issue)
      toast.success(mode === "create" ? "Feature created" : `#${feature.id} saved`)
      await refreshFeatures()
      onOpenChange(false)
    } catch (e: any) {
      toast.error(mode === "create" ? "Couldn't create feature" : "Couldn't save feature", { description: e?.message })
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
        <DialogTitle className="text-sm">{mode === "create" ? "New feature" : `Edit feature #${feature.id}`}</DialogTitle>
        <DialogDescription>Fields marked * are required by KAP</DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 md:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <FormField label="Subject" required hint={err("subject")}>
            <Input
              autoFocus={mode === "create"}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-9 text-sm"
              aria-invalid={!!err("subject") || undefined}
            />
          </FormField>
          <FormField label="Description" required hint={err("description")}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-28 text-xs"
              aria-invalid={!!err("description") || undefined}
            />
          </FormField>
          <FormField label="Acceptance criteria" required hint={err("acceptance")}>
            <Textarea
              value={acceptance}
              onChange={(e) => setAcceptance(e.target.value)}
              className="min-h-28 text-xs"
              aria-invalid={!!err("acceptance") || undefined}
            />
          </FormField>
        </div>

        <div className="flex flex-col gap-4 rounded-lg bg-muted/40 p-3.5">
          <FormField label="Epic" required hint={err("epic")}>
            <EpicPicker projectId={projectId} value={epicId} onChange={setEpicId} invalid={!!err("epic")} />
          </FormField>

          <FormField label="T-shirt size" required hint={`= ${T_SHIRT_POINTS[size]} point(s)`}>
            <ToggleGroup
              value={[size]}
              onValueChange={(v: string[]) => v[0] && setSize(v[0])}
              variant="outline"
              size="sm"
              spacing={0}
              className="w-full"
            >
              {T_SHIRT_SIZES.map((s) => (
                <ToggleGroupItem key={s} value={s} className="flex-1 px-0">
                  {s}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </FormField>

          <FormField label="Size unit">
            <Select value={uom} onValueChange={(v) => v && setUom(String(v))}>
              <SelectTrigger className="h-8 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZE_UOMS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Assignee" required hint={err("assignee")}>
            <MemberSelect
              projectId={projectId}
              value={assigneeId}
              onChange={setAssigneeId}
              fallbackName={feature?.assigned_to?.name}
              invalid={!!err("assignee")}
            />
          </FormField>

          <FormField label="Approved by" required hint={err("approver")}>
            <MemberSelect projectId={projectId} value={approverId} onChange={setApproverId} invalid={!!err("approver")} />
          </FormField>

          <div className="grid grid-cols-2 gap-2">
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
          {saving ? "Saving…" : mode === "create" ? "Create feature" : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  )
}
