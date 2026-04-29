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
import { createStory } from "@/lib/api/story"
import { getEpics } from "@/lib/api/epic"
import { mutate } from "swr"
import useSWR from "swr"
import { ApiConfig } from "@/lib/utils"

const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13]

export default function CreateStoryDialog({ projectId, sprintId, assignedToId }: any) {
    const [open, setOpen] = useState(false)
    const [subject, setSubject] = useState("")
    const [description, setDescription] = useState("")
    const [estimatedHours, setEstimatedHours] = useState("")
    const [storyPoints, setStoryPoints] = useState("")
    const [assignedToUserId, setAssignedToUserId] = useState(assignedToId)
    const [parentEpicId, setParentEpicId] = useState("")
    const [acceptanceCriteria, setAcceptanceCriteria] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")

    const { data: epics } = useSWR(
        projectId && open ? ["epics", projectId] : null,
        () => getEpics(projectId),
        ApiConfig
    )

    const validate = () => {
        if (!subject.trim()) return "Subject is required"
        if (!estimatedHours || Number(estimatedHours) < 0) return "Valid estimated hours required"
        if (!storyPoints) return "Story points are required"
        if (!acceptanceCriteria.trim()) return "Acceptance criteria is required"
        if (!startDate) return "Start date is required"
        if (!endDate) return "End date is required"

        if (new Date(startDate) > new Date(endDate)) {
            return "Start date cannot be after end date"
        }

        return null
    }

    const handleSubmit = async () => {
        const error = validate()
        if (error) {
            alert(error)
            return
        }

        const customFields = [
            { id: 72, value: acceptanceCriteria },
            { id: 8, value: String(storyPoints) },
            { id: 43, value: startDate },
            { id: 44, value: endDate },
        ]

        const issuePayload: any = {
            project_id: projectId,
            tracker_id: 5,
            status_id: 1,
            priority_id: 2,
            subject,
            description,
            fixed_version_id: sprintId,
            assigned_to_id: assignedToUserId,
            estimated_hours: Number(estimatedHours),
            remaining_hours: Number(estimatedHours),
            custom_fields: customFields,
            rb_story_points: Number(storyPoints),
        }

        if (parentEpicId) {
            issuePayload.parent_issue_id = Number(parentEpicId)
        }

        const success = await createStory(issuePayload)

        if (success) {
            mutate(["sprintStories", sprintId])
            handleReset()
            setOpen(false)
        } else {
            alert("Failed to create story")
        }
    }

    const handleReset = () => {
        setSubject("")
        setDescription("")
        setEstimatedHours("")
        setStoryPoints("")
        setAssignedToUserId(assignedToId)
        setParentEpicId("")
        setAcceptanceCriteria("")
        setStartDate("")
        setEndDate("")
    }

    useEffect(() => {
        if (storyPoints) setEstimatedHours(String(4.5 * Number(storyPoints)))
    }, [storyPoints])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button size="sm" variant="secondary" className="h-7 px-3 text-xs">
                        Create Story
                    </Button>
                }
            />

            <DialogContent className="max-w-full min-w-5/6 max-h-[90vh] overflow-y-auto p-6">
                <DialogHeader>
                    <DialogTitle className="text-sm">Create User Story</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4">

                    {/* Subject - Full width */}
                    <div className="grow space-y-1">
                        <div className="text-[10px] opacity-60 font-medium">Subject *</div>
                        <Input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Enter story subject"
                            className="h-8 text-xs"
                        />
                    </div>

                    {/* Description - Full width */}


                    <div className="flex items-start gap-2 w-full min-w-full grow">

                        <div className="basis-1/3 grow space-y-1">
                            <div className="text-[10px] opacity-60 font-medium">Description</div>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter story description"
                                className="text-xs h-32 overflow-auto max-w-135 resize-none"
                            />
                        </div>

                        {/* Acceptance Criteria - Full width */}
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
                        {/* Assigned To User ID */}
                        <div className="space-y-1">
                            <div className="text-[10px] opacity-60 font-medium">Assigned To *</div>
                            <Input
                                type="text"
                                value={assignedToUserId}
                                onChange={(e) => setAssignedToUserId(Number(e.target.value))}
                                placeholder="User ID"
                                className="h-8 text-xs"
                            />
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
                                    <SelectValue placeholder="Select points" />
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
                        Create Story
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
