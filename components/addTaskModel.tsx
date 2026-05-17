"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createTask } from "@/lib/api/task"
import { mutate } from "swr"
import { getNextTaskStatuses, TASK_RULES } from "@/lib/utils"
import { toast } from "sonner"

const categoryMap: any = {
    CODING: "WORK",
    PLANNING: "WORK",
    "UNIT TESTING": "WORK",
    "TEAM MEETING": "NA",
    MISCELLANEOUS: "NA",
    TRAINING: "NA",
}

export default function CreateTaskDialog({ parent_issue_id , project_id, assigned_to_id }: any) {
    const [open, setOpen] = useState(false)

    const currentStatus = { id: 1, name: "New" } // default
    const nextStatuses = getNextTaskStatuses(currentStatus.name)
    const options = [currentStatus, ...nextStatuses]

    const [selectedStatus, setSelectedStatus] = useState(String(currentStatus.id))

    const [subject, setSubject] = useState("")
    const [desc, setDesc] = useState("")
    const [est, setEst] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [rem, setRem] = useState(0)
    const [doneRatio, setDoneRatio] = useState(0)

    const [category, setCategory] = useState("CODING")

    // Attachments: each entry holds the File + an optional description
    const [attachments, setAttachments] = useState<{ file: File; description: string }[]>([])

    const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = Array.from(e.target.files ?? [])
        setAttachments(prev => [
            ...prev,
            ...picked.map(f => ({ file: f, description: f.name })),
        ])
        // reset input so the same file can be re-added after removal
        e.target.value = ""
    }

    const removeAttachment = (idx: number) =>
        setAttachments(prev => prev.filter((_, i) => i !== idx))

    const updateDescription = (idx: number, val: string) =>
        setAttachments(prev =>
            prev.map((a, i) => (i === idx ? { ...a, description: val } : a))
        )

    const selectedObj = options.find((s: any) => String(s.id) === selectedStatus)
    const required = TASK_RULES[selectedObj?.name] || []

    useEffect(() => {
        if (selectedObj?.name === "Completed") {
            setDoneRatio(100)
        }
    }, [selectedStatus])

    const validate = () => {
        if (!subject.trim()) return "Subject required"
        if (!category) return "Category required"
        if (!startDate) return "Start date required"
        if (!endDate) return "End date required"

        if (Number(est) < 0) return "Estimated invalid"
        if (Number(rem) < 0) return "Remaining invalid"
        if (doneRatio < 0 || doneRatio > 100) return "Done % invalid"

        if (new Date(startDate) > new Date(endDate)) {
            return "Start > End"
        }

        if (required.includes("start_date") && !startDate) return "Start required"
        if (required.includes("end_date") && !endDate) return "End required"

        return null
    }

    const handleSubmit = async () => {
        const error = validate()
        if (error) {
            toast.error(error)
            return
        }

        const type = categoryMap[category]

        const files = attachments

        toast.promise(
            createTask(
                {
                    tracker_id: 6,
                    parent_issue_id,
                    project_id,
                    assigned_to_id,
                    subject,
                    description: desc,
                    status_id: selectedObj.id,
                    estimated_hours: Number(est),
                    remaining_hours: Number(rem),
                    start_date: startDate,
                    due_date: endDate,
                    custom_fields: [
                        { id: 13, value: category },
                        { id: 14, value: type },
                        { id: 15, value: String(rem) },
                        { id: 43, value: startDate },
                        { id: 44, value: endDate },
                    ],
                },
                files,
            ),
            {
                loading: "Creating task…",
                success: (ok) => {
                    if (!ok) throw new Error("Task creation failed")
                    mutate(["tasks", parent_issue_id])
                    setOpen(false)
                    return "Task created"
                },
                error: (err) => err?.message ?? "Failed to create task",
            }
        )
    }

    const handleReset = () => {
        setSubject("")
        setDesc("")
        setEst("")
        setStartDate("")
        setEndDate("")
        setRem(0)
        setDoneRatio(0)
        setSelectedStatus(String(currentStatus.id))
        setCategory("CODING")
        setAttachments([])
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button size="sm" variant={"secondary"} className="h-6 px-3 text-[10px]">
                        Add Task
                    </Button>
                }
            />

            <DialogContent className="w-[95vw] sm:min-w-3/5 max-w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">

                <DialogHeader>
                    <DialogTitle className="text-sm">
                        Create Task
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">

                    <div className="col-span-full space-y-1">
                        <div className="text-[10px] opacity-60">Subject</div>
                        <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-8 text-xs" />
                    </div>

                    <div className="col-span-full space-y-1">
                        <div className="text-[10px] opacity-60">Description</div>
                        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="text-xs h-28" />
                    </div>

                    <div className="space-y-1">
                        <div className="text-[10px] opacity-60">Status</div>
                         {/* @ts-expect-error */}
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue>
                                    {options.find((s: any) => String(s.id) === selectedStatus)?.name}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {options.map((s: any) => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <div className="text-[10px] opacity-60">Category</div>
                         {/* @ts-expect-error */}
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.keys(categoryMap).map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <div className="text-[10px] opacity-60">Type</div>
                        <Input value={categoryMap[category]} disabled className="h-8 text-xs" />
                    </div>

                    <div className="space-y-1">
                        <div className="text-[10px] opacity-60">Estimated</div>
                        <Input type="number" value={est} onChange={(e) => setEst(e.target.value)} className="h-8 text-xs" />
                    </div>

                    <div className="space-y-1">
                        <div className="text-[10px] opacity-60">Remaining</div>
                        <Input type="number" value={rem} onChange={(e) => setRem(Number(e.target.value))} className="h-8 text-xs" />
                    </div>

                    <div className="space-y-1">
                        <div className="text-[10px] opacity-60">Done %</div>
                        <Input type="number" value={doneRatio} onChange={(e) => setDoneRatio(Number(e.target.value))} className="h-8 text-xs" />
                    </div>

                    <div className="space-y-1">
                        <div className="text-[10px] opacity-60">Start Date</div>
                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-xs" />
                    </div>

                    <div className="space-y-1">
                        <div className="text-[10px] opacity-60">End Date</div>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 text-xs" />
                    </div>

                    {/* ── Attachments ── */}
                    <div className="col-span-full space-y-2">
                        <div className="text-[10px] opacity-60">Attachments</div>

                        <Input
                            type="file"
                            multiple
                            className="h-8 text-xs cursor-pointer"
                            onChange={handleFilesChange}
                        />

                        {attachments.length > 0 && (
                            <div className="space-y-2 pt-1">
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

                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={handleReset} className="h-8 text-xs">
                        Reset
                    </Button>
                    <Button onClick={handleSubmit} className="h-8 text-xs">
                        Create
                    </Button>
                </div>

            </DialogContent>
        </Dialog>
    )
}