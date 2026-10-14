"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { IconNotes, IconPaperclip, IconX } from "@tabler/icons-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Kbd } from "@/components/ui/kbd"
import { FormField } from "@/components/forms/form-field"
import { updateIssue } from "@/lib/api/issue"
import { todayLocal } from "@/lib/date"

type Props = {
  taskId: number
  iconOnly?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
}

// Daily update note on a task (same text format KAP already uses).
export default function TaskNoteDialog({ taskId, iconOnly = false, open: openProp, onOpenChange, hideTrigger = false }: Props) {
  const [innerOpen, setInnerOpen] = useState(false)
  const open = openProp ?? innerOpen
  const setOpen = onOpenChange ?? setInnerOpen

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger
          render={
            iconOnly ? (
              <Button size="icon-sm" variant="ghost" className="text-muted-foreground hover:text-foreground" aria-label="Add note" />
            ) : (
              <Button size="sm" variant="outline" />
            )
          }
        >
          <IconNotes />
          {!iconOnly && "Note"}
        </DialogTrigger>
      )}
      <DialogContent className="flex max-h-[92vh] w-[min(40rem,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        {open && <NoteForm taskId={taskId} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function NoteForm({ taskId, onDone }: { taskId: number; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [date, setDate] = useState(todayLocal())
  const [update, setUpdate] = useState("")
  const [tomorrow, setTomorrow] = useState("")
  const [blockers, setBlockers] = useState("")
  const [files, setFiles] = useState<{ file: File; description: string }[]>([])
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!update.trim()) {
      toast.error("Write what was done")
      return
    }
    const notes = [
      `+*Date:*+ ${date}`,
      `+*Task Update:*+ ${update || "N/A"}`,
      `+*Tomorrow's Plan:*+ ${tomorrow || "N/A"}`,
      `+*Risks/Roadblocks:*+ ${blockers || "N/A"}`,
    ].join("\n\n")

    setSaving(true)
    try {
      await updateIssue(taskId, { notes }, files)
      toast.success(`Note added to #${taskId}`)
      onDone()
    } catch (e: any) {
      toast.error("Couldn't add note", { description: e?.message })
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
        <DialogTitle className="text-sm">Update note · #{taskId}</DialogTitle>
        <DialogDescription>Posted as a comment on the task in KAP</DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        <FormField label="Date" className="w-40">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 text-xs" />
        </FormField>
        <FormField label="What was done" required>
          <Textarea autoFocus value={update} onChange={(e) => setUpdate(e.target.value)} className="min-h-20 text-xs" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Tomorrow's plan">
            <Textarea value={tomorrow} onChange={(e) => setTomorrow(e.target.value)} className="min-h-16 text-xs" />
          </FormField>
          <FormField label="Risks / blockers">
            <Textarea value={blockers} onChange={(e) => setBlockers(e.target.value)} className="min-h-16 text-xs" />
          </FormField>
        </div>

        <div className="space-y-2">
          <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <IconPaperclip /> Attach files
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
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-[11px]">
              <IconPaperclip className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{f.file.name}</span>
              <Button type="button" size="icon-sm" variant="ghost" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                <IconX />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <DialogFooter className="shrink-0 items-center border-t px-5 py-3">
        <span className="mr-auto hidden text-[11px] text-muted-foreground sm:inline">
          <Kbd>Ctrl</Kbd> <Kbd>Enter</Kbd> to post
        </span>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Posting…" : "Post note"}
        </Button>
      </DialogFooter>
    </form>
  )
}
