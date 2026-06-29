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
import { createFeature } from "@/lib/api/feature"
import { getEpics } from "@/lib/api/epic"
import { getProjectMembers } from "@/lib/api/project"
import { getCurrentUser } from "@/lib/api/user"
import { mutate } from "swr"
import useSWR from "swr"
import { ApiConfig } from "@/lib/utils"
import { toast } from "sonner"

const T_SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"]
const T_SHIRT_SIZE_POINTS: Record<string, number> = { XS: 1, S: 1, M: 3, L: 5, XL: 8, XXL: 13 }
const SIZE_UOMS = ["Pages", "Requirements", "Blocks", "Signals"]

export default function CreateFeatureModal({ projectId }: { projectId: number }) {
    const [open, setOpen] = useState(false)
    const [subject, setSubject] = useState("")
    const [description, setDescription] = useState("")
    const [acceptanceCriteria, setAcceptanceCriteria] = useState("")
    const [assignedToId, setAssignedToId] = useState("")
    const [approvedById, setApprovedById] = useState("")
    const [parentEpicId, setParentEpicId] = useState("")
    const [tShirtSize, setTShirtSize] = useState("M")
    const [sizeUom, setSizeUom] = useState("Pages")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")

    const { data: epics } = useSWR(
        projectId && open ? ["epics", projectId] : null,
        () => getEpics(projectId),
        ApiConfig
    )

    const { data: members } = useSWR(
        projectId && open ? ["project-members", projectId] : null,
        () => getProjectMembers(projectId),
        ApiConfig
    )

    const { data: currentUser } = useSWR(
        open ? ["user"] : null,
        getCurrentUser,
        ApiConfig
    )

    useEffect(() => {
        if (currentUser?.id) {
            if (!assignedToId) setAssignedToId(String(currentUser.id))
            if (!approvedById) setApprovedById(String(currentUser.id))
        }
    }, [currentUser])

    const validate = () => {
        if (!subject.trim()) return "Subject is required"
        if (!description.trim()) return "Description is required"
        if (!acceptanceCriteria.trim()) return "Acceptance criteria is required"
        if (!assignedToId) return "Assignee is required"
        if (!approvedById) return "Approved By is required"
        if (!parentEpicId) return "Parent epic is required"
        if (!startDate) return "Start date is required"
        if (!endDate) return "End date is required"
        if (new Date(startDate) > new Date(endDate)) return "Start date cannot be after end date"
        return null
    }

    const handleSubmit = async () => {
        const error = validate()
        if (error) { toast.error(error); return }

        const issuePayload: any = {
            project_id: projectId,
            tracker_id: 2,
            status_id: 1,
            priority_id: 2,
            subject,
            description,
            assigned_to_id: Number(assignedToId),
            parent_issue_id: Number(parentEpicId),
            start_date: startDate,
            due_date: endDate,
            custom_fields: [
                { id: 72,  value: acceptanceCriteria },
                { id: 4,   value: tShirtSize },
                { id: 5,   value: String(T_SHIRT_SIZE_POINTS[tShirtSize] ?? 1) },
                { id: 8,   value: String(T_SHIRT_SIZE_POINTS[tShirtSize] ?? 1) },
                { id: 6,   value: sizeUom },
                { id: 43,  value: startDate },
                { id: 44,  value: endDate },
                { id: 45,  value: approvedById },
            ],
        }

        toast.promise(
            createFeature(issuePayload),
            {
                loading: "Creating feature…",
                success: (ok) => {
                    if (!ok) throw new Error("Feature creation failed")
                    mutate((key: any) => Array.isArray(key) && key[0] === "features" && key[1] === projectId)
                    handleReset()
                    setOpen(false)
                    return "Feature created"
                },
                error: (err) => err?.message ?? "Failed to create feature",
            }
        )
    }

    const handleReset = () => {
        setSubject("")
        setDescription("")
        setAcceptanceCriteria("")
        setAssignedToId(currentUser?.id ? String(currentUser.id) : "")
        setApprovedById(currentUser?.id ? String(currentUser.id) : "")
        setParentEpicId("")
        setTShirtSize("M")
        setSizeUom("Pages")
        setStartDate("")
        setEndDate("")
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button size="sm" variant="secondary" className="h-7 px-3 text-xs">
                        Create Feature
                    </Button>
                }
            />

            <DialogContent className="w-[95vw] sm:min-w-5/6 max-w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="text-sm">Create Feature</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4">

                    <div className="grow space-y-1">
                        <div className="text-[10px] opacity-60 font-medium">Subject *</div>
                        <Input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Enter feature subject"
                            className="h-8 text-xs"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row items-start gap-2 w-full">
                        <div className="w-full sm:basis-1/2 sm:grow space-y-1">
                            <div className="text-[10px] opacity-60 font-medium">Description *</div>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter feature description"
                                className="text-xs h-28 sm:h-32 overflow-auto resize-none w-full"
                            />
                        </div>
                        <div className="w-full sm:basis-1/2 sm:grow space-y-1">
                            <div className="text-[10px] opacity-60 font-medium">Acceptance Criteria *</div>
                            <Textarea
                                value={acceptanceCriteria}
                                onChange={(e) => setAcceptanceCriteria(e.target.value)}
                                placeholder="Enter acceptance criteria"
                                className="text-xs h-28 sm:h-32 overflow-auto resize-none w-full"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 sm:gap-6 items-start sm:items-center">

                        <div className="space-y-1">
                            <div className="text-[10px] opacity-60 font-medium">Assigned To *</div>
                            <Select value={assignedToId} onValueChange={(v) => v != null && setAssignedToId(v)}>
                                <SelectTrigger className="h-8 text-xs min-w-36">
                                    <SelectValue>
                                        {members?.find((m: any) => String(m.id) === assignedToId)?.name ?? "Select member"}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {members?.map((m: any) => (
                                        <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <div className="text-[10px] opacity-60 font-medium">Approved By *</div>
                            <Select value={approvedById} onValueChange={(v) => v != null && setApprovedById(v)}>
                                <SelectTrigger className="h-8 text-xs min-w-36">
                                    <SelectValue>
                                        {members?.find((m: any) => String(m.id) === approvedById)?.name ?? "Select member"}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {members?.map((m: any) => (
                                        <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <div className="text-[10px] opacity-60 font-medium">Parent Epic *</div>
                            <Select value={parentEpicId} onValueChange={(v) => v != null && setParentEpicId(v)}>
                                <SelectTrigger className="h-8 text-xs min-w-40">
                                    <SelectValue placeholder="Select epic" />
                                </SelectTrigger>
                                <SelectContent>
                                    {epics?.map((epic: any) => (
                                        <SelectItem key={epic.id} value={String(epic.id)}>{epic.subject}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <div className="text-[10px] opacity-60 font-medium">T-Shirt Size</div>
                            <Select value={tShirtSize} onValueChange={(v) => v != null && setTShirtSize(v)}>
                                <SelectTrigger className="h-8 text-xs w-24">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {T_SHIRT_SIZES.map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <div className="text-[10px] opacity-60 font-medium">Size UOM</div>
                            <Select value={sizeUom} onValueChange={(v) => v != null && setSizeUom(v)}>
                                <SelectTrigger className="h-8 text-xs w-36">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SIZE_UOMS.map((u) => (
                                        <SelectItem key={u} value={u}>{u}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <div className="text-[10px] opacity-60 font-medium">Start Date *</div>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="text-[10px] opacity-60 font-medium">End Date *</div>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>

                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={handleReset} className="h-8 text-xs">Reset</Button>
                    <Button onClick={handleSubmit} className="h-8 text-xs">Create Feature</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
