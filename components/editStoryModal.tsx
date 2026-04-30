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
import { getTasks } from "@/lib/api/task"
import { mutate } from "swr"
import useSWR from "swr"
import { ApiConfig, US_FLOW, getNextUSStatuses } from "@/lib/utils"
import { toast } from "sonner"

const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13]

interface EditStoryDialogProps {
    story: any
    sprintId: any
}

export default function EditStoryDialog({ story, sprintId }: EditStoryDialogProps) {
    const [open, setOpen] = useState(false)

    const getField = (id: number) =>
        story.custom_fields?.find((f: any) => f.id === id)?.value ?? ""

    // Status options: current + next allowed statuses from flow
    const currentStatusObj = US_FLOW.find((s) => s.name === story.status?.name) ?? US_FLOW[0]
    const nextStatuses = getNextUSStatuses(currentStatusObj.name)
    const statusOptions = [currentStatusObj, ...nextStatuses]

    const [subject, setSubject] = useState(story.subject ?? "")
    const [description, setDescription] = useState(story.description ?? "")
    const [estimatedHours, setEstimatedHours] = useState(String(story.estimated_hours ?? ""))
    const [storyPoints, setStoryPoints] = useState(String(story.rb_story_points ?? getField(8) ?? ""))
    const [assignedToId, setAssignedToId] = useState(String(story.assigned_to?.id ?? ""))
    const [parentEpicId, setParentEpicId] = useState(String(story.parent?.id ?? ""))
    const [acceptanceCriteria, setAcceptanceCriteria] = useState(getField(72))
    const [startDate, setStartDate] = useState(getField(43) || story.start_date || "")
    const [endDate, setEndDate] = useState(getField(44) || story.due_date || "")
    const [selectedStatus, setSelectedStatus] = useState(String(currentStatusObj.name))

    // Reset form when modal closes
    useEffect(() => {
        if (!open) {
            setSubject(story.subject ?? "")
            setDescription(story.description ?? "")
            setEstimatedHours(String(story.estimated_hours ?? ""))
            setStoryPoints(String(story.rb_story_points ?? getField(8) ?? ""))
            setAssignedToId(String(story.assigned_to?.id ?? ""))
            setParentEpicId(String(story.parent?.id ?? ""))
            setAcceptanceCriteria(getField(72))
            setStartDate(getField(43) || story.start_date || "")
            setEndDate(getField(44) || story.due_date || "")
            setSelectedStatus(String(currentStatusObj.name))
        }
    }, [open])

    // Auto-fill estimated hours from story points
    useEffect(() => {
        if (storyPoints) setEstimatedHours(String(4.5 * Number(storyPoints)))
    }, [storyPoints])

    // Fetch epics and project members only when modal is open
    const projectId = story.project?.id

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

    // Fetch tasks — reuses the same SWR key as StoryCard (cache hit)
    const { data: tasks } = useSWR(
        open ? ["tasks", story.id] : null,
        () => getTasks(story.id),
        ApiConfig
    )

    const TASK_DONE_STATUSES = ["Closed"]

    const validate = () => {
        if (!subject.trim()) return "Subject is required"
        if (!estimatedHours || Number(estimatedHours) < 0) return "Valid estimated hours required"
        if (!storyPoints) return "Story points are required"
        if (!acceptanceCriteria.trim()) return "Acceptance criteria is required"
        if (!startDate) return "Start date is required"
        if (!endDate) return "End date is required"
        if (new Date(startDate) > new Date(endDate)) return "Start date cannot be after end date"
        return null
    }

    const handleSubmit = () => {
        const error = validate()
        if (error) {
            toast.error(error)
            return
        }

        // Closed status guard — all tasks must be Completed or Closed
        const targetStatus = statusOptions.find((s) => String(s.name) === String(selectedStatus))

        if (targetStatus?.name === "Closed") {
            const openTasks = (tasks ?? []).filter(
                (t: any) => !TASK_DONE_STATUSES.includes(t.status?.name)
            )
            if (openTasks.length > 0) {
                const names = openTasks.map((t: any) => `"${t.subject}"`).join(", ")
                toast.error("Cannot close story — open tasks remain", {
                    description: `${openTasks.length} task(s) still open: ${names}`,
                    duration: 7000,
                })
                return
            }
        }

        const statusObj = statusOptions.find((s) => String(s.name) === selectedStatus)

        const updates: any = {
            subject,
            description,
            estimated_hours: Number(estimatedHours),
            remaining_hours: Number(estimatedHours),
            assigned_to_id: Number(assignedToId),
            status_id: statusObj?.id,
            rb_story_points: Number(storyPoints),
            custom_fields: [
                { id: 72, value: acceptanceCriteria },
                { id: 8, value: String(storyPoints) },
                { id: 43, value: startDate },
                { id: 44, value: endDate },
            ],
        }

        if (parentEpicId) updates.parent_issue_id = Number(parentEpicId)

        toast.promise(
            updateStory(story.id, updates),
            {
                loading: "Updating story…",
                success: (ok) => {
                    if (!ok) throw new Error("Story update failed")
                    mutate((key: any) => Array.isArray(key) && key[0] === "sprintStories" && String(key[1]) === String(sprintId))
                    setOpen(false)
                    return "Story updated"
                },
                error: (err) => err?.message ?? "Failed to update story",
            }
        )
    }

    const handleReset = () => {
        setSubject(story.subject ?? "")
        setDescription(story.description ?? "")
        setEstimatedHours(String(story.estimated_hours ?? ""))
        setStoryPoints(String(story.rb_story_points ?? getField(8) ?? ""))
        setAssignedToId(String(story.assigned_to?.id ?? ""))
        setParentEpicId(String(story.parent?.id ?? ""))
        setAcceptanceCriteria(getField(72))
        setStartDate(getField(43) || story.start_date || "")
        setEndDate(getField(44) || story.due_date || "")
        setSelectedStatus(String(currentStatusObj.name))
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button size="sm" variant="default" className="h-6 text-[10px] px-2">
                        Update
                    </Button>
                }
            />

            <DialogContent className="max-w-full min-w-5/6 max-h-[90vh] overflow-y-auto p-6">
                <DialogHeader>
                    <DialogTitle className="text-sm">Update User Story</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4">

                    {/* Subject */}
                    <div className="grow space-y-1">
                        <div className="text-[10px] opacity-60 font-medium">Subject *</div>
                        <Input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Enter story subject"
                            className="h-8 text-xs"
                        />
                    </div>

                    <div className="flex items-start gap-2 w-full min-w-full grow">

                        {/* Description */}
                        <div className="basis-1/3 grow space-y-1">
                            <div className="text-[10px] opacity-60 font-medium">Description</div>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter story description"
                                className="text-xs h-32 overflow-auto max-w-135 resize-none"
                            />
                        </div>

                        {/* Acceptance Criteria */}
                        <div className="basis-1/3 grow space-y-1">
                            <div className="text-[10px] opacity-60 font-medium">Acceptance Criteria *</div>
                            <Textarea
                                value={acceptanceCriteria}
                                onChange={(e) => setAcceptanceCriteria(e.target.value)}
                                placeholder="Enter acceptance criteria"
                                className="text-xs h-32 overflow-auto max-w-135 resize-none"
                            />
                        </div>
                    </div>

                    <div className="basis-1/3 grow flex flex-wrap gap-6 items-center justify-between">

                        {/* Status */}
                        <div className="space-y-1">
                            <div className="text-[10px] opacity-60 font-medium">Status *</div>
                            {/* @ts-expect-error */}
                            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                <SelectTrigger className="h-8 text-xs w-36">
                                    <SelectValue>
                                        {selectedStatus}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {statusOptions.map((s) => (
                                        <SelectItem key={s.id} value={String(s.name)}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Assigned To — member dropdown */}
                        <div className="space-y-1">
                            <div className="text-[10px] opacity-60 font-medium">Assigned To *</div>
                            {/* @ts-expect-error */}
                            <Select value={assignedToId} onValueChange={setAssignedToId}>
                                <SelectTrigger className="h-8 text-xs min-w-36">
                                    <SelectValue>
                                        {members?.find((m: any) => String(m.id) === String(assignedToId))?.name
                                            ?? story.assigned_to?.name
                                            ?? "Select member"}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {members?.map((m: any) => (
                                        <SelectItem key={m.id} value={String(m.id)}>
                                            {m.name}
                                        </SelectItem>
                                    ))}
                                    {/* Fallback if members not loaded yet */}
                                    {!members && story.assigned_to && (
                                        <SelectItem value={String(story.assigned_to.id)}>
                                            {story.assigned_to.name}
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Estimated Hours */}
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

                        {/* Story Points */}
                        <div className="space-y-1">
                            <div className="text-[10px] opacity-60 font-medium">Story Points *</div>
                            {/* @ts-expect-error */}
                            <Select value={storyPoints} onValueChange={setStoryPoints}>
                                <SelectTrigger className="h-8 text-xs w-20">
                                    <SelectValue placeholder="Points" />
                                </SelectTrigger>
                                <SelectContent>
                                    {FIBONACCI_POINTS.map((point) => (
                                        <SelectItem key={point} value={String(point)}>
                                            {point}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Parent Epic */}
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
                                        <SelectItem key={epic.id} value={String(epic.id)}>
                                            {epic.subject}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Start Date */}
                        <div className="space-y-1">
                            <div className="text-[10px] opacity-60 font-medium">Start Date *</div>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>

                        {/* End Date */}
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
                    <Button variant="outline" onClick={handleReset} className="h-8 text-xs">
                        Reset
                    </Button>
                    <Button onClick={handleSubmit} className="h-8 text-xs">
                        Update Story
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
