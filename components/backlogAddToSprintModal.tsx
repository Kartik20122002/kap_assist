"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { getSprints } from "@/lib/api/sprint"
import { getProjectMembers } from "@/lib/api/project"
import { updateStory } from "@/lib/api/story"
import { mutate } from "swr"
import useSWR from "swr"
import { ApiConfig } from "@/lib/utils"
import { toast } from "sonner"

function getMissingFields(story: any): string[] {
    const getField = (id: number) =>
        story.custom_fields?.find((f: any) => f.id === id)?.value ?? ""

    const missing: string[] = []
    if (!story.subject?.trim()) missing.push("Subject")
    if (!story.description?.trim()) missing.push("Description")
    if (!story.rb_story_points) missing.push("Story Points")
    if (!story.estimated_hours) missing.push("Estimated Hours")
    if (!getField(72)?.trim()) missing.push("Acceptance Criteria")
    if (!story.assigned_to?.id) missing.push("Assigned To")
    if (!story.parent?.id) missing.push("Parent Epic")
    if (!getField(45)) missing.push("Approved By")
    return missing
}

export default function BacklogAddToSprintModal({ story, projectId }: { story: any, projectId: number }) {
    const [open, setOpen] = useState(false)
    const [selectedSprintId, setSelectedSprintId] = useState("")
    const [selectedAssigneeId, setSelectedAssigneeId] = useState("")

    const missingFields = getMissingFields(story)
    const isBlocked = missingFields.length > 0

    const { data: sprintsData } = useSWR(
        projectId && open && !isBlocked ? ["sprints", projectId] : null,
        () => getSprints(projectId),
        ApiConfig
    )

    const { data: members } = useSWR(
        projectId && open && !isBlocked ? ["project-members", projectId] : null,
        () => getProjectMembers(projectId),
        ApiConfig
    )

    const openSprints = (sprintsData?.versions ?? [])
        .filter((s: any) => s.status === "open")
        .sort((a: any, b: any) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())

    useEffect(() => {
        if (openSprints.length > 0 && !selectedSprintId) {
            setSelectedSprintId(String(openSprints[0].id))
        }
    }, [openSprints.length])

    useEffect(() => {
        if (!open) {
            setSelectedSprintId("")
            setSelectedAssigneeId("")
        }
    }, [open])

    const handleSubmit = () => {
        if (!selectedSprintId) {
            toast.error("Please select a sprint")
            return
        }

        const updates: any = { fixed_version_id: Number(selectedSprintId) }
        if (selectedAssigneeId) updates.assigned_to_id = Number(selectedAssigneeId)

        const sprintId = selectedSprintId
        toast.promise(
            updateStory(story.id, updates),
            {
                loading: "Adding to sprint…",
                success: (ok) => {
                    if (!ok) throw new Error("Failed to add to sprint")
                    mutate((key: any) => Array.isArray(key) && key[0] === "backlogStories")
                    mutate((key: any) => Array.isArray(key) && key[0] === "sprintStories" && String(key[1]) === String(sprintId))
                    setOpen(false)
                    return `"${story.subject}" added to sprint`
                },
                error: (err) => err?.message ?? "Failed to add to sprint",
            }
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2">
                        Add to Sprint
                    </Button>
                }
            />

            <DialogContent className="max-w-sm p-6">
                <DialogHeader>
                    <DialogTitle className="text-sm">Add to Sprint</DialogTitle>
                </DialogHeader>

                <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {story.subject}
                </div>

                {isBlocked ? (
                    <div className="space-y-3">
                        <div className="text-xs text-destructive font-medium">
                            Complete these mandatory fields before adding to a sprint:
                        </div>
                        <ul className="space-y-1">
                            {missingFields.map((f) => (
                                <li key={f} className="text-xs text-destructive flex items-center gap-1.5">
                                    <span className="size-1.5 rounded-full bg-destructive inline-block" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                        <div className="flex justify-end pt-2">
                            <Button variant="outline" className="h-8 text-xs" onClick={() => setOpen(false)}>
                                Close
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col gap-4">
                            <div className="space-y-1">
                                <div className="text-[10px] opacity-60 font-medium">Sprint *</div>
                                
                                <Select value={selectedSprintId} onValueChange={(v) => v != null && setSelectedSprintId(v)}>
                                    <SelectTrigger className="h-8 text-xs w-full">
                                        <SelectValue placeholder={openSprints.length === 0 ? "No open sprints" : "Select sprint"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {openSprints.map((s: any) => (
                                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <div className="text-[10px] opacity-60 font-medium">Assign To (Optional)</div>
                                
                                <Select value={selectedAssigneeId} onValueChange={(v) => v != null && setSelectedAssigneeId(v)}>
                                    <SelectTrigger className="h-8 text-xs w-full">
                                        <SelectValue placeholder="Keep unassigned" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Keep unassigned</SelectItem>
                                        {members?.map((m: any) => (
                                            <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" className="h-8 text-xs" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button className="h-8 text-xs" onClick={handleSubmit} disabled={!selectedSprintId}>
                                Add to Sprint
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
