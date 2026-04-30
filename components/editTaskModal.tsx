/* eslint-disable react-hooks/set-state-in-effect */
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
import { updateTask } from "@/lib/api/task"
import { mutate } from "swr"
import { getNextTaskStatuses, TASK_RULES } from "@/lib/utils"

const categoryMap: any = {
    CODING: "WORK",
    PLANNING: "WORK",
    "UNIT TESTING": "WORK",
    "TEAM MEETING": "NA",
    MISCELLANEOUS: "NA",
    TRAINING: "NA",
}

export default function EditTaskDialog({ task, taskTime }: any) {
    const [open, setOpen] = useState(false)

    const nextStatuses = getNextTaskStatuses(task.status?.name)

    const currentStatus = {
        id: task.status?.id,
        name: task.status?.name,
    }

    const options = [currentStatus, ...nextStatuses]

    const [selectedStatus, setSelectedStatus] = useState(String(currentStatus.id))

    const [subject, setSubject] = useState(task.subject)
    const [desc, setDesc] = useState(task.description || "")
    const [est, setEst] = useState(task.estimated_hours || "")
    const [startDate, setStartDate] = useState(task.start_date || "")
    const [endDate, setEndDate] = useState(task.due_date || "")
    const [rem, setRem] = useState(Math.max(0, (task?.estimated_hours ?? 0) - taskTime))
    const [doneRatio, setDoneRatio] = useState(task.done_ratio || 0)

    const [category, setCategory] = useState(
        task.custom_fields?.find((f: any) => f.id === 13)?.value || "CODING"
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

        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            return "Start date > End date"
        }

        // flow-based rules
        if (required.includes("start_date") && !startDate) {
            return "Start date required for this status"
        }

        if (required.includes("end_date") && !endDate) {
            return "End date required for this status"
        }

        return null
    }

    const handleSubmit = async () => {

        const error = validate()
        if (error) {
            alert(error) // simple for now
            return
        }

        if (!selectedObj) return

        if (required.includes("start_date") && !startDate) return
        if (required.includes("end_date") && !endDate) return

        const type = categoryMap[category]

        await updateTask(task.id, {
            subject,
            description: desc,
            status_id: selectedObj.id,
            estimated_hours: Number(est),
            remaining_hours: Number(rem),
            done_ratio: Number(doneRatio),
            start_date: startDate || undefined,
            due_date: endDate || undefined,
            custom_fields: [
                { id: 13, value: category },
                { id: 14, value: type },
                { id: 15, value: String(rem) },
                { id: 43, value: startDate || "" },
                { id: 44, value: endDate || "" },
            ],
        })

        mutate(["tasks", task.parent?.id])
        setOpen(false)
    }

    const handleReset = () => {
        setSubject(task.subject)
        setDesc(task.description || "")
        setEst(task.estimated_hours || "")
        setStartDate(task.start_date || "")
        setEndDate(task.due_date || "")
        setSelectedStatus(String(currentStatus.id))
        setCategory("CODING")
        setDoneRatio(task.done_ratio || 0)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button size="sm" variant="secondary" className="h-6 px-4 text-[10px]">
                        Edit
                    </Button>
                }
            />

            <DialogContent className="min-w-3/5 p-6">

                <DialogHeader>
                    <DialogTitle className="text-sm">
                        Edit Task
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-4">

                    <div className="space-y-1 col-span-3">
                        <div className="text-[10px] opacity-60">Subject</div>
                        <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-8 text-xs" />
                    </div>

                    <div className="space-y-1 col-span-3">
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
                        <div className="text-[10px] opacity-60">Work Category *</div>
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
                        <div className="text-[10px] opacity-60">Work Type</div>
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
                        <Input
                            type="number"
                            value={doneRatio}
                            onChange={(e) => setDoneRatio(Number(e.target.value))}
                            className="h-8 text-xs"
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="text-[10px] opacity-60">Start Date</div>
                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-xs" />
                    </div>

                    <div className="space-y-1">
                        <div className="text-[10px] opacity-60">End Date</div>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 text-xs" />
                    </div>

                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={handleReset} className="h-8 text-xs">
                        Reset
                    </Button>
                    <Button onClick={handleSubmit} className="h-8 text-xs">
                        Save
                    </Button>
                </div>

            </DialogContent>
        </Dialog>
    )
}