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
import { updateStory } from "@/lib/api/story"
import { getEpics } from "@/lib/api/epic"
import { getProjectMembers } from "@/lib/api/project"
import { mutate } from "swr"
import useSWR from "swr"
import { ApiConfig, US_FLOW, getNextUSStatuses, getBugStatusOptions } from "@/lib/utils"
import { toast } from "sonner"

const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13]

function buildStatusOptions(story: any) {
    const trackerId = story.tracker?.id
    const currentStatusName = story.status?.name ?? ""

    if (trackerId === 5) {
        const current = US_FLOW.find((s) => s.name === currentStatusName) ?? US_FLOW[0]
        const nexts = getNextUSStatuses(current.name)
        return { options: [current, ...nexts], isUserStory: true, isBug: false }
    }

    if (trackerId === 15) {
        return { options: getBugStatusOptions(currentStatusName), isUserStory: false, isBug: true }
    }

    const currentId = story.status?.id ?? 1
    return {
        options: [{ id: currentId, name: currentStatusName }],
        isUserStory: false,
        isBug: false,
    }
}

export default function BacklogEditStoryModal({ story }: { story: any }) {
    const [open, setOpen] = useState(false)

    const getField = (id: number) =>
        story.custom_fields?.find((f: any) => f.id === id)?.value ?? ""

    const { options: statusOptions, isUserStory, isBug } = buildStatusOptions(story)
    const projectId = story.project?.id
    const spentHours = story.spent_hours ?? 0

    const [subject, setSubject] = useState(story.subject ?? "")
    const [description, setDescription] = useState(story.description ?? "")
    const [estimatedHours, setEstimatedHours] = useState(String(story.estimated_hours ?? ""))
    const [storyPoints, setStoryPoints] = useState(String(story.rb_story_points ?? ""))
    const [parentEpicId, setParentEpicId] = useState(String(story.parent?.id ?? ""))
    const [acceptanceCriteria, setAcceptanceCriteria] = useState(getField(72))
    const [approvedById, setApprovedById] = useState(getField(45) || "")
    const [selectedStatus, setSelectedStatus] = useState(String(statusOptions[0]?.name ?? ""))
    const [assignedToId, setAssignedToId] = useState(String(story.assigned_to?.id ?? ""))

    useEffect(() => {
        if (!open) {
            setSubject(story.subject ?? "")
            setDescription(story.description ?? "")
            setEstimatedHours(String(story.estimated_hours ?? ""))
            setStoryPoints(String(story.rb_story_points ?? ""))
            setParentEpicId(String(story.parent?.id ?? ""))
            setAcceptanceCriteria(getField(72))
            setApprovedById(getField(45) || "")
            setSelectedStatus(String(statusOptions[0]?.name ?? ""))
            setAssignedToId(String(story.assigned_to?.id ?? ""))
        }
    }, [open])

    useEffect(() => {
        if (isUserStory && storyPoints) setEstimatedHours(String(4.5 * Number(storyPoints)))
    }, [storyPoints])

    const { data: epics } = useSWR(
        projectId && open && isUserStory ? ["epics", projectId] : null,
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
        if (isUserStory) {
            if (!description.trim()) return "Description is required"
            if (!estimatedHours || Number(estimatedHours) < 0) return "Valid estimated hours required"
            if (!storyPoints) return "Story points are required"
            if (!acceptanceCriteria.trim()) return "Acceptance criteria is required"
            if (!assignedToId) return "Assignee is required"
            if (!approvedById) return "Approved By is required"
        }
        return null
    }

    const handleSubmit = () => {
        const error = validate()
        if (error) {
            toast.error(error)
            return
        }

        const statusObj = statusOptions.find((s) => String(s.name) === selectedStatus)

        const updates: any = {
            subject,
            description,
            status_id: statusObj?.id,
        }

        if (assignedToId) updates.assigned_to_id = Number(assignedToId)

        if (isBug && estimatedHours) {
            updates.estimated_hours = Number(estimatedHours)
        }

        if (isUserStory) {
            const pts = Number(storyPoints)
            const est = Number(estimatedHours)
            const remaining = Math.max(0, est - spentHours)

            updates.estimated_hours = est
            updates.remaining_hours = remaining
            updates.rb_story_points = pts
            updates.custom_fields = [
                { id: 72,  value: acceptanceCriteria },
                { id: 5,   value: String(pts) },
                { id: 8,   value: String(pts) },
                { id: 45,  value: approvedById },
                { id: 780, value: "NA" },
                { id: 781, value: "NA" },
            ]
            if (parentEpicId) updates.parent_issue_id = Number(parentEpicId)
        }

        toast.promise(
            updateStory(story.id, updates),
            {
                loading: "Updating…",
                success: (ok) => {
                    if (!ok) throw new Error("Update failed")
                    mutate((key: any) => Array.isArray(key) && key[0] === "backlogStories")
                    setOpen(false)
                    return "Updated"
                },
                error: (err) => err?.message ?? "Failed to update",
            }
        )
    }

    const handleReset = () => {
        setSubject(story.subject ?? "")
        setDescription(story.description ?? "")
        setEstimatedHours(String(story.estimated_hours ?? ""))
        setStoryPoints(String(story.rb_story_points ?? ""))
        setParentEpicId(String(story.parent?.id ?? ""))
        setAcceptanceCriteria(getField(72))
        setApprovedById(getField(45) || "")
        setSelectedStatus(String(statusOptions[0]?.name ?? ""))
        setAssignedToId(String(story.assigned_to?.id ?? ""))
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button size="sm" variant="default" className="h-6 text-[10px] px-2">
                        Edit
                    </Button>
                }
            />

            <DialogContent className="w-[95vw] sm:min-w-5/6 max-w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="text-sm">
                        Edit {story.tracker?.name ?? "Item"}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4">

                    <div className="grow space-y-1">
                        <div className="text-[10px] opacity-60 font-medium">Subject *</div>
                        <Input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Enter subject"
                            className="h-8 text-xs"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row items-start gap-2 w-full">
                        <div className="w-full sm:basis-1/2 sm:grow space-y-1">
                            <div className="text-[10px] opacity-60 font-medium">
                                Description {isUserStory ? "*" : ""}
                            </div>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter description"
                                className="text-xs h-28 sm:h-32 overflow-auto resize-none w-full"
                            />
                        </div>
                        {isUserStory && (
                            <div className="w-full sm:basis-1/2 sm:grow space-y-1">
                                <div className="text-[10px] opacity-60 font-medium">Acceptance Criteria *</div>
                                <Textarea
                                    value={acceptanceCriteria}
                                    onChange={(e) => setAcceptanceCriteria(e.target.value)}
                                    placeholder="Enter acceptance criteria"
                                    className="text-xs h-28 sm:h-32 overflow-auto resize-none w-full"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-4 sm:gap-6 items-start sm:items-center">

                        <div className="space-y-1">
                            <div className="text-[10px] opacity-60 font-medium">Status *</div>
                            {/* @ts-expect-error */}
                            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                <SelectTrigger className="h-8 text-xs w-36">
                                    <SelectValue>{selectedStatus}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {statusOptions.map((s) => (
                                        <SelectItem key={s.id} value={String(s.name)}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <div className="text-[10px] opacity-60 font-medium">
                                Assigned To {isUserStory ? "*" : "(Optional)"}
                            </div>
                            {/* @ts-expect-error */}
                            <Select value={assignedToId} onValueChange={setAssignedToId}>
                                <SelectTrigger className="h-8 text-xs min-w-36">
                                    <SelectValue>
                                        {members?.find((m: any) => String(m.id) === assignedToId)?.name
                                            ?? story.assigned_to?.name
                                            ?? "Unassigned"}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {!isUserStory && <SelectItem value="">Unassigned</SelectItem>}
                                    {members?.map((m: any) => (
                                        <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {isBug && (
                            <div className="space-y-1">
                                <div className="text-[10px] opacity-60 font-medium">Estimated Hours</div>
                                <Input
                                    type="number"
                                    value={estimatedHours}
                                    onChange={(e) => setEstimatedHours(e.target.value)}
                                    placeholder="0"
                                    className="h-8 text-xs w-20"
                                    min="0"
                                />
                            </div>
                        )}

                        {isUserStory && (
                            <>
                                <div className="space-y-1">
                                    <div className="text-[10px] opacity-60 font-medium">Approved By *</div>
                                    {/* @ts-expect-error */}
                                    <Select value={approvedById} onValueChange={setApprovedById}>
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
                                    <div className="text-[10px] opacity-60 font-medium">Story Points *</div>
                                    {/* @ts-expect-error */}
                                    <Select value={storyPoints} onValueChange={setStoryPoints}>
                                        <SelectTrigger className="h-8 text-xs w-20">
                                            <SelectValue placeholder="Points" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {FIBONACCI_POINTS.map((point) => (
                                                <SelectItem key={point} value={String(point)}>{point}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <div className="text-[10px] opacity-60 font-medium">Estimated Hours *</div>
                                    <Input
                                        type="number"
                                        value={estimatedHours}
                                        onChange={(e) => setEstimatedHours(e.target.value)}
                                        placeholder="0"
                                        className="h-8 text-xs w-20"
                                        min="0"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <div className="text-[10px] opacity-60 font-medium">Parent Epic (Optional)</div>
                                    {/* @ts-expect-error */}
                                    <Select value={parentEpicId} onValueChange={setParentEpicId}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="Select epic" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">None</SelectItem>
                                            {epics?.map((epic: any) => (
                                                <SelectItem key={epic.id} value={String(epic.id)}>{epic.subject}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={handleReset} className="h-8 text-xs">Reset</Button>
                    <Button onClick={handleSubmit} className="h-8 text-xs">Update</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
