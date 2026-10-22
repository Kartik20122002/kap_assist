"use client"

import { useRef, useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { IconNotes, IconPaperclip, IconPencil, IconX } from "@tabler/icons-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Kbd } from "@/components/ui/kbd"
import { Skeleton } from "@/components/ui/skeleton"
import { FormField } from "@/components/forms/form-field"
import { getIssue, updateIssue, updateJournal } from "@/lib/api/issue"
import { formatShortDate, todayLocal } from "@/lib/date"
import { useUser } from "@/hooks/use-kap"
import { cn } from "@/lib/utils"

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
      <DialogContent className="flex h-[min(46rem,92vh)] w-[min(76rem,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        {open && <NotePanel taskId={taskId} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

// ── Note text format ──────────────────────────────────────────────────────────

const LABEL = {
  date: "Date",
  update: "Task Update",
  tomorrow: "Tomorrow's Plan",
  blockers: "Risks/Roadblocks",
} as const

type NoteFields = { date: string; update: string; tomorrow: string; blockers: string }

// "app" = what this dialog posts:   +*Date:*+ 2026-10-21, blank line between sections
// "alt" = also found in KAP notes:   *+Date+*: 21-10-2026, one line per section
type NoteStyle = "app" | "alt"

const buildNote = (f: NoteFields, style: NoteStyle = "app") => {
  const rows: [string, string][] = [
    [LABEL.date, style === "alt" ? f.date.split("-").reverse().join("-") : f.date],
    [LABEL.update, f.update || "N/A"],
    [LABEL.tomorrow, f.tomorrow || "N/A"],
    [LABEL.blockers, f.blockers || "N/A"],
  ]
  return style === "alt"
    ? rows.map(([l, v]) => `*+${l}+*: ${v}`).join("\n")
    : rows.map(([l, v]) => `+*${l}:*+ ${v}`).join("\n\n")
}

// DD-MM-YYYY or YYYY-MM-DD → YYYY-MM-DD; null when it's neither.
const toISODate = (s: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

// Reads a template note back into fields; null for any other note (edited as raw text).
const parseNote = (text: string): (NoteFields & { style: NoteStyle }) | null => {
  const parts = text.split(/(?:\+\*|\*\+)\s*([A-Za-z'/ ]+?)\s*:?\s*(?:\*\+|\+\*)\s*:?/)
  const map: Record<string, string> = {}
  for (let i = 1; i < parts.length; i += 2) map[parts[i].trim()] = parts[i + 1]?.trim() ?? ""
  if (!(LABEL.update in map)) return null
  const value = (label: string) => (map[label] === "N/A" ? "" : (map[label] ?? ""))
  const date = value(LABEL.date) ? toISODate(value(LABEL.date)) : ""
  if (date === null) return null
  return {
    date,
    update: value(LABEL.update),
    tomorrow: value(LABEL.tomorrow),
    blockers: value(LABEL.blockers),
    style: text.trimStart().startsWith("*+") ? "alt" : "app",
  }
}

const formatStamp = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : ""

// ── Panel: form (left) + existing notes (right) ───────────────────────────────

function NotePanel({ taskId, onDone }: { taskId: number; onDone: () => void }) {
  const { data: user } = useUser()
  const { data: issue, mutate } = useSWR(["issueNotes", taskId], () => getIssue(taskId), { revalidateOnFocus: false })
  const notes: any[] = [...(issue?.journals ?? [])].filter((j: any) => j.notes?.trim()).reverse()

  const fileRef = useRef<HTMLInputElement>(null)
  const [date, setDate] = useState(todayLocal())
  const [update, setUpdate] = useState("")
  const [tomorrow, setTomorrow] = useState("")
  const [blockers, setBlockers] = useState("")
  const [files, setFiles] = useState<{ file: File; description: string }[]>([])
  const [saving, setSaving] = useState(false)

  // Editing an existing note: template notes load into the fields, anything else edits as raw text.
  const [editing, setEditing] = useState<any | null>(null)
  const [raw, setRaw] = useState<string | null>(null)

  const loadFields = (f: NoteFields) => {
    setDate(f.date)
    setUpdate(f.update)
    setTomorrow(f.tomorrow)
    setBlockers(f.blockers)
  }

  const startEdit = (journal: any) => {
    const parsed = parseNote(journal.notes)
    setEditing(journal)
    setFiles([])
    if (parsed) {
      loadFields(parsed)
      setRaw(null)
    } else setRaw(journal.notes)
  }

  const stopEdit = () => {
    setEditing(null)
    setRaw(null)
    loadFields({ date: todayLocal(), update: "", tomorrow: "", blockers: "" })
  }

  const submit = async () => {
    if (raw !== null ? !raw.trim() : !update.trim()) {
      toast.error(raw !== null ? "The note can't be empty" : "Write what was done")
      return
    }
    // An edited note keeps the style it was written in
    const style = editing ? (parseNote(editing.notes)?.style ?? "app") : "app"
    const text = raw ?? buildNote({ date, update, tomorrow, blockers }, style)

    setSaving(true)
    try {
      if (editing) {
        await updateJournal(editing.id, text)
        toast.success("Note updated")
        stopEdit()
        await mutate()
      } else {
        await updateIssue(taskId, { notes: text }, files)
        toast.success(`Note added to #${taskId}`)
        onDone()
      }
    } catch (e: any) {
      toast.error(editing ? "Couldn't update note" : "Couldn't add note", { description: e?.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <DialogHeader className="shrink-0 border-b px-5 py-3.5">
        <DialogTitle className="text-sm">Notes · #{taskId}</DialogTitle>
        <DialogDescription className="truncate">{issue?.subject ?? "Posted as a comment on the task in KAP"}</DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
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
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
            {editing && (
              <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-xs">
                <IconPencil className="size-3.5 shrink-0 text-primary" />
                <span className="flex-1">Editing note from {formatStamp(editing.created_on)}</span>
                <Button type="button" size="sm" variant="ghost" onClick={stopEdit}>
                  Cancel edit
                </Button>
              </div>
            )}

            {raw !== null ? (
              <FormField label="Note" required>
                <Textarea autoFocus value={raw} onChange={(e) => setRaw(e.target.value)} className="min-h-64 text-xs" />
              </FormField>
            ) : (
              <>
                <FormField label="Date" className="w-40">
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 text-xs" />
                </FormField>
                <FormField label="What was done" required>
                  <Textarea autoFocus value={update} onChange={(e) => setUpdate(e.target.value)} className="min-h-28 text-xs" />
                </FormField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Tomorrow's plan">
                    <Textarea value={tomorrow} onChange={(e) => setTomorrow(e.target.value)} className="min-h-20 text-xs" />
                  </FormField>
                  <FormField label="Risks / blockers">
                    <Textarea value={blockers} onChange={(e) => setBlockers(e.target.value)} className="min-h-20 text-xs" />
                  </FormField>
                </div>
              </>
            )}

            {/* KAP only takes attachments with a new note, not on an edit */}
            {!editing && (
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
            )}
          </div>

          <DialogFooter className="shrink-0 items-center border-t px-5 py-3">
            <span className="mr-auto hidden text-[11px] text-muted-foreground sm:inline">
              <Kbd>Ctrl</Kbd> <Kbd>Enter</Kbd> to {editing ? "save" : "post"}
            </span>
            <Button type="button" variant="ghost" onClick={onDone}>
              Close
            </Button>
            <Button type="submit" disabled={saving}>
              {editing ? (saving ? "Saving…" : "Save note") : saving ? "Posting…" : "Post note"}
            </Button>
          </DialogFooter>
        </form>

        <aside className="flex max-h-[40vh] min-h-0 shrink-0 flex-col border-t bg-muted/30 md:max-h-none md:w-md md:border-t-0 md:border-l">
          <div className="flex shrink-0 items-center justify-between px-4 py-2.5 text-xs font-medium">
            Previous notes
            {issue && <span className="text-muted-foreground tabular-nums">{notes.length}</span>}
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4">
            {!issue ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)
            ) : notes.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No notes on this task yet</p>
            ) : (
              notes.map((j: any) => (
                <NoteCard
                  key={j.id}
                  journal={j}
                  canEdit={!!user && j.user?.id === user.id}
                  active={editing?.id === j.id}
                  onEdit={() => startEdit(j)}
                />
              ))
            )}
          </div>
        </aside>
      </div>
    </>
  )
}

function NoteCard({ journal, canEdit, active, onEdit }: { journal: any; canEdit: boolean; active: boolean; onEdit: () => void }) {
  const parsed = parseNote(journal.notes)
  const edited = journal.updated_on && journal.updated_on !== journal.created_on

  return (
    <article className={cn("rounded-lg border bg-card p-3 text-xs", active && "ring-2 ring-primary/50")}>
      <header className="mb-2 flex items-center gap-2">
        <span className="truncate font-medium">{journal.user?.name}</span>
        <span className="text-[11px] text-muted-foreground">
          {formatStamp(journal.created_on)}
          {edited && " · edited"}
        </span>
        {canEdit && (
          <Button size="icon-sm" variant="ghost" className="ml-auto text-muted-foreground hover:text-foreground" onClick={onEdit} aria-label="Edit note">
            <IconPencil />
          </Button>
        )}
      </header>

      {parsed ? (
        <div className="space-y-1.5">
          {parsed.date && <div className="text-[11px] font-medium text-muted-foreground">{formatShortDate(parsed.date)}</div>}
          <NoteSection label="Done" text={parsed.update} />
          <NoteSection label="Plan" text={parsed.tomorrow} />
          <NoteSection label="Risks" text={parsed.blockers} />
        </div>
      ) : (
        <p className="leading-relaxed wrap-break-word whitespace-pre-wrap">{journal.notes}</p>
      )}
    </article>
  )
}

function NoteSection({ label, text }: { label: string; text: string }) {
  if (!text) return null
  return (
    <div>
      <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{label}</div>
      <p className="leading-relaxed wrap-break-word whitespace-pre-wrap">{text}</p>
    </div>
  )
}
