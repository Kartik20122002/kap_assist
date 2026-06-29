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
import { getFeatures } from "@/lib/api/feature"
import { getProjectMembers } from "@/lib/api/project"
import { getCurrentUser } from "@/lib/api/user"
import { mutate } from "swr"
import useSWR from "swr"
import { ApiConfig } from "@/lib/utils"
import { toast } from "sonner"

const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13]

export default function BacklogCreateStoryModal({ projectId }: { projectId: number }) {
    const [open, setOpen] = useState(false)
    const [subject, setSubject] = useState("")
    const [description, setDescription] = useState("")
    const [estimatedHours, setEstimatedHours] = useState("")
    const [storyPoints, setStoryPoints] = useState("")
    const [assignedToUserId, setAssignedToUserId] = useState("")
    const [parentEpicId, setParentEpicId] = useState("")
    const [acceptanceCriteria, setAcceptanceCriteria] = useState("")
    const [approvedById, setApprovedById] = useState("")

    const { data: features } = useSWR(
        projectId && open ? ["features", projectId] : null,
        () => getFeatures(projectId),
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
        if (currentUser?.id && !approvedById) {
            setApprovedById(String(currentUser.id))
        }
    }, [currentUser])

    const validate = () => {
        if (!subject.trim()) return "Subject is required"
        if (!description.trim()) return "Description is required"
        if (!storyPoints) return "Story points are required"
        if (!estimatedHours || Number(estimatedHours) < 0) return "Valid estimated hours required"
        if (!acceptanceCriteria.trim()) return "Acceptance criteria is required"
        if (!assignedToUserId) return "Assignee is required"
        if (!approvedById) return "Approved By is required"
        return null
    }

    const handleSubmit = async () => {
        const error = validate()
        if (error) {
            toast.error(error)
            return
        }

        const pts = Number(storyPoints)
        const est = Number(estimatedHours)

        const issuePayload: any = {
            project_id: projectId,
            tracker_id: 5,
            status_id: 1,
            priority_id: 2,
            subject,
            description,
            assigned_to_id: Number(assignedToUserId),
            estimated_hours: est,
            remaining_hours: est,
            rb_story_points: pts,
            custom_fields: [
                { id: 72,  value: acceptanceCriteria },
                { id: 5,   value: String(pts) },
                { id: 8,   value: String(pts) },
                { id: 45,  value: approvedById },
                { id: 780, value: "NA" },
                { id: 781, value: "NA" },
            ],
        }

        if (parentEpicId) issuePayload.parent_issue_id = Number(parentEpicId)

        toast.promise(
            createStory(issuePayload),
            {
                loading: "Creating story…",
                success: (ok) => {
                    if (!ok) throw new Error("Story creation failed")
                    mutate((key: any) => Array.isArray(key) && key[0] === "backlogStories")
                    handleReset()
                    setOpen(false)
                    return "Story created"
                },
                error: (err) => err?.message ?? "Failed to create story",
            }
        )
    }

    const handleReset = () => {
        setSubject("")
        setDescription("")
        setEstimatedHours("")
        setStoryPoints("")
        setAssignedToUserId("")
        setParentEpicId("")
        setAcceptanceCriteria("")
        setApprovedById(currentUser?.id ? String(currentUser.id) : "")
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

            <DialogContent className="w-[95vw] sm:min-w-5/6 max-w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="text-sm">Create Backlog Story</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4">

                    <div className="grow space-y-1">
                        <div className="text-[10px] opacity-60 font-medium">Subject *</div>
                        <Input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Enter story subject"
                            className="h-8 text-xs"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row items-start gap-2 w-full">
                        <div className="w-full sm:basis-1/2 sm:grow space-y-1">
                            <div className="text-[10px] opacity-60 font-medium">Description *</div>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter story description"
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
                            
                            <Select value={assignedToUserId} onValueChange={(v) => v != null && setAssignedToUserId(v)}>
                                <SelectTrigger className="h-8 text-xs min-w-36">
                                    <SelectValue placeholder="Select member">
                                        {members?.find((m: any) => String(m.id) === assignedToUserId)?.name ?? "Select member"}
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
                                    <SelectValue placeholder="Select member">
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
                            
                            <Select value={storyPoints} onValueChange={(v) => v != null && setStoryPoints(v)}>
                                <SelectTrigger className="h-8 text-xs w-20">
                                    <SelectValue placeholder="Select points" />
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
                            <div className="text-[10px] opacity-60 font-medium">Parent Feature (Optional)</div>
                            
                            <Select value={parentEpicId} onValueChange={(v) => v != null && setParentEpicId(v)}>
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Select feature" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">None</SelectItem>
                                    {features?.issues?.map((epic: any) => (
                                        <SelectItem key={epic.id} value={String(epic.id)}>{epic.subject}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={handleReset} className="h-8 text-xs">Reset</Button>
                    <Button onClick={handleSubmit} className="h-8 text-xs">Create Story</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
