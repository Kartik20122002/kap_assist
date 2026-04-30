"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { updateTask } from "@/lib/api/task"
import { uploadAttachments } from "@/lib/api/file"

export default function TaskNoteDialog({ taskId }: any) {
    const today = new Date().toISOString().split("T")[0]

    const [open, setOpen] = useState(false)
    const [date, setDate] = useState(today)
    const [update, setUpdate] = useState("")
    const [tomorrow, setTomorrow] = useState("")
    const [blockers, setBlockers] = useState("")

    // Attachments: each entry holds the File + an optional description
    const [attachments, setAttachments] = useState<{ file: File; description: string }[]>([])

    const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = Array.from(e.target.files ?? [])
        setAttachments(prev => [
            ...prev,
            ...picked.map(f => ({ file: f, description: f.name })),
        ])
        // reset so the same file can be picked again after removal
        e.target.value = ""
    }

    const removeAttachment = (idx: number) =>
        setAttachments(prev => prev.filter((_, i) => i !== idx))

    const updateDescription = (idx: number, val: string) =>
        setAttachments(prev =>
            prev.map((a, i) => (i === idx ? { ...a, description: val } : a))
        )

    const buildNote = () => {
        return `
        +*Date:*+ ${date}

        +*Task Update:*+ ${update || "N/A"}

        +*Tomorrow's Plan:*+ ${tomorrow || "N/A"}

        +*Risks/Roadblocks:*+ ${blockers || "N/A"}`
    }

    const handleSubmit = async () => {
        const notes = buildNote()

        // Upload any attached files first, then include their tokens in the note update
        let uploads: any[] = []
        if (attachments.length > 0) {
            uploads = await uploadAttachments(attachments)
        }

        await updateTask(taskId, {
            notes,
            ...(uploads.length > 0 ? { uploads } : {}),
        })

        setOpen(false)
        setUpdate("")
        setTomorrow("")
        setBlockers("")
        setAttachments([])
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button size="sm" variant="outline" className="h-6 px-4 text-[10px]">
                        Note
                    </Button>
                }
            />

            <DialogContent className="max-w-xl p-4 space-y-3">
                <DialogHeader>
                    <DialogTitle className="text-sm">Add Note</DialogTitle>
                </DialogHeader>

                {/* Date */}
                <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-8 text-xs"
                />

                {/* Update */}
                <Textarea
                    placeholder="Task update"
                    value={update}
                    onChange={(e) => setUpdate(e.target.value)}
                    className="text-xs"
                />

                {/* Tomorrow */}
                <Textarea
                    placeholder="Tomorrow plan"
                    value={tomorrow}
                    onChange={(e) => setTomorrow(e.target.value)}
                    className="text-xs"
                />

                {/* Blockers */}
                <Textarea
                    placeholder="Blockers"
                    value={blockers}
                    onChange={(e) => setBlockers(e.target.value)}
                    className="text-xs"
                />

                {/* ── Attachments ── */}
                <div className="space-y-2">
                    <div className="text-[10px] opacity-60">Attachments</div>

                    <Input
                        type="file"
                        multiple
                        className="h-8 text-xs cursor-pointer"
                        onChange={handleFilesChange}
                    />

                    {attachments.length > 0 && (
                        <div className="space-y-2">
                            {attachments.map((a, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] text-muted-foreground truncate mb-0.5">
                                            {a.file.name}
                                        </div>
                                        <Input
                                            value={a.description}
                                            onChange={(e) => updateDescription(idx, e.target.value)}
                                            placeholder="Description (optional)"
                                            className="h-7 text-[10px]"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-[10px] text-destructive hover:text-destructive"
                                        onClick={() => removeAttachment(idx)}
                                    >
                                        ✕
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <Button onClick={handleSubmit} className="h-8 text-xs w-full">
                    Save Note
                </Button>
            </DialogContent>
        </Dialog>
    )
}