"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { updateTask } from "@/lib/api/task"

export default function TaskNoteDialog({ taskId, notes = [] }: any) {
    const today = new Date().toISOString().split("T")[0]

    const [open, setOpen] = useState(false)
    const [date, setDate] = useState(today)
    const [update, setUpdate] = useState("")
    const [tomorrow, setTomorrow] = useState("")
    const [blockers, setBlockers] = useState("")

    const buildNote = () => {
        return `
        +*Date:*+ ${date}

        +*Task Update:*+ ${update || "N/A"}

        +*Tomorrow's Plan:*+ ${tomorrow || "N/A"}

        +*Risks/Roadblocks:*+ ${blockers || "N/A"}`
    }

    const handleSubmit = async () => {
        const notes = buildNote()
        await updateTask(taskId, { notes })
        setOpen(false)
        setUpdate("")
        setTomorrow("")
        setBlockers("")
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

                <Button onClick={handleSubmit} className="h-8 text-xs">
                    Save Note
                </Button>
            </DialogContent>
        </Dialog>
    )
}