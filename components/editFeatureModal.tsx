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
import { updateFeature } from "@/lib/api/feature"
import { getEpics } from "@/lib/api/epic"
import { getProjectMembers } from "@/lib/api/project"
import { mutate } from "swr"
import useSWR from "swr"
import { ApiConfig, FEATURE_FLOW, getNextFeatureStatuses } from "@/lib/utils"
import { toast } from "sonner"
import { IconAdjustments } from "@tabler/icons-react"

const T_SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"]
const T_SHIRT_SIZE_POINTS: Record<string, number> = { XS: 1, S: 1, M: 3, L: 5, XL: 8, XXL: 13 }
const SIZE_UOMS = ["Pages", "Requirements", "Blocks", "Signals"]

interface EditFeatureModalProps {
    feature: any
    iconOnly?: boolean
}

export default function EditFeatureModal({ feature, iconOnly = false }: EditFeatureModalProps) {
    const [open, setOpen] = useState(false)

    const getField = (id: number) =>
        feature.custom_fields?.find((f: any) => f.id === id)?.value ?? ""

    const currentStatusObj = FEATURE_FLOW.find((s) => s.name === feature.status?.name) ?? FEATURE_FLOW[0]
    const nextStatuses = getNextFeatureStatuses(currentStatusObj.name)
    const statusOptions = [currentStatusObj, ...nextStatuses]

    const projectId = feature.project?.id

    const init = () => ({
        subject: feature.subject ?? "",
        description: feature.description ?? "",
        acceptanceCriteria: getField(72),
        assignedToId: String(feature.assigned_to?.id ?? ""),
        approvedById: getField(45),
        parentEpicId: String(feature.parent?.id ?? ""),
        tShirtSize: getField(4) || "M",
        sizeUom: getField(6) || "Pages",
        startDate: getField(43) || feature.start_date || "",
        endDate: getField(44) || feature.due_date || "",
        selectedStatus: currentStatusObj.name,
    })

    const [subject, setSubject] = useState(init().subject)
    const [description, setDescription] = useState(init().description)
    const [acceptanceCriteria, setAcceptanceCriteria] = useState(init().acceptanceCriteria)
    const [assignedToId, setAssignedToId] = useState(init().assignedToId)
    const [approvedById, setApprovedById] = useState(init().approvedById)
    const [parentEpicId, setParentEpicId] = useState(init().parentEpicId)
    const [tShirtSize, setTShirtSize] = useState(init().tShirtSize)
    const [sizeUom, setSizeUom] = useState(init().sizeUom)
    const [startDate, setStartDate] = useState(init().startDate)
    const [endDate, setEndDate] = useState(init().endDate)
    const [selectedStatus, setSelectedStatus] = useState(init().selectedStatus)

    useEffect(() => {
        if (!open) {
            const i = init()
            setSubject(i.subject)
            setDescription(i.description)
            setAcceptanceCriteria(i.acceptanceCriteria)
            setAssignedToId(i.assignedToId)
            setApprovedById(i.approvedById)
            setParentEpicId(i.parentEpicId)
            setTShirtSize(i.tShirtSize)
            setSizeUom(i.sizeUom)
            setStartDate(i.startDate)
            setEndDate(i.endDate)
            setSelectedStatus(i.selectedStatus)
        }
    }, [open])

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

    const handleSubmit = () => {
        const error = validate()
        if (error) { toast.error(error); return }

        const statusObj = statusOptions.find((s) => s.name === selectedStatus)

        const updates: any = {
            subject,
            description,
            assigned_to_id: Number(assignedToId),
            parent_issue_id: Number(parentEpicId),
            status_id: statusObj?.id,
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
            updateFeature(feature.id, updates),
            {
                loading: "Updating feature…",
                success: (ok) => {
                    if (!ok) throw new Error("Feature update failed")
                    mutate((key: any) => Array.isArray(key) && key[0] === "features")
                    setOpen(false)
                    return "Feature updated"
                },
                error: (err) => err?.message ?? "Failed to update feature",
            }
        )
    }

    const handleReset = () => {
        const i = init()
        setSubject(i.subject)
        setDescription(i.description)
        setAcceptanceCriteria(i.acceptanceCriteria)
        setAssignedToId(i.assignedToId)
        setApprovedById(i.approvedById)
        setParentEpicId(i.parentEpicId)
        setTShirtSize(i.tShirtSize)
        setSizeUom(i.sizeUom)
        setStartDate(i.startDate)
        setEndDate(i.endDate)
        setSelectedStatus(i.selectedStatus)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    iconOnly ? (
                        <Button size="icon" variant="ghost" className="size-9 text-muted-foreground hover:text-foreground">
                            <IconAdjustments className="size-4.5" />
                        </Button>
                    ) : (
                        <Button size="sm" variant="default" className="h-6 text-[10px] px-2">
                            Update
                        </Button>
                    )
                }
            />

            <DialogContent className="w-[95vw] sm:min-w-5/6 max-w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="text-sm">Update Feature <span className="opacity-50 font-normal">#{feature.id}</span></DialogTitle>
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
                            <div className="text-[10px] opacity-60 font-medium">Status *</div>
                            <Select value={selectedStatus} onValueChange={(v) => v != null && setSelectedStatus(v)}>
                                <SelectTrigger className="h-8 text-xs w-36">
                                    <SelectValue>{selectedStatus}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {statusOptions.map((s) => (
                                        <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <div className="text-[10px] opacity-60 font-medium">Assigned To *</div>
                            <Select value={assignedToId} onValueChange={(v) => v != null && setAssignedToId(v)}>
                                <SelectTrigger className="h-8 text-xs min-w-36">
                                    <SelectValue>
                                        {members?.find((m: any) => String(m.id) === assignedToId)?.name
                                            ?? feature.assigned_to?.name
                                            ?? "Select member"}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {members?.map((m: any) => (
                                        <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                                    ))}
                                    {!members && feature.assigned_to && (
                                        <SelectItem value={String(feature.assigned_to.id)}>
                                            {feature.assigned_to.name}
                                        </SelectItem>
                                    )}
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
                                    {!epics && feature.parent && (
                                        <SelectItem value={String(feature.parent.id)}>
                                            #{feature.parent.id}
                                        </SelectItem>
                                    )}
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
                    <Button onClick={handleSubmit} className="h-8 text-xs">Update Feature</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
