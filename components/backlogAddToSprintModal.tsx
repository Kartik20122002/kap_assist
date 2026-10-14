"use client"

import { useState } from "react"
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
import { pickCurrentSprint, sortSprints } from "@/lib/session"
import { toast } from "sonner"
import { IconTargetArrow } from "@tabler/icons-react"

export function getMissingFields(story: any): string[] {
    const getField = (id: number) =>
        story.custom_fields?.find((f: any) => f.id === id)?.value ?? ""

    const missing: string[] = []
    if (!story.subject?.trim()) missing.push("Subject")
    if (!story.description?.trim()) missing.push("Description")
    if (!story.rb_story_points) missing.push("Story Points")
    if (!story.estimated_hours) missing.push("Estimated Hours")
    if (!getField(72)?.trim()) missing.push("Acceptance Criteria")
    if (!story.assigned_to?.id) missing.push("Assigned To")
    if (!story.parent?.id) missing.push("Feature")
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

    const openSprints = sortSprints(sprintsData?.versions ?? []).filter((s: any) => s.status === "open")
    // Default = current sprint (first open by name); the user can pick another
    const sprintChoice = selectedSprintId || String(pickCurrentSprint(openSprints)?.id ?? "")

    const changeOpen = (o: boolean) => {
        setOpen(o)
        if (!o) {
            setSelectedSprintId("")
            setSelectedAssigneeId("")
        }
    }

    const handleSubmit = () => {
        if (!sprintChoice) {
            toast.error("Please select a sprint")
            return
        }

        const updates: any = { fixed_version_id: Number(sprintChoice) }
        if (selectedAssigneeId) updates.assigned_to_id = Number(selectedAssigneeId)

        const sprintId = sprintChoice
        toast.promise(
            updateStory(story.id, updates),
            {
                loading: "Adding to sprint…",
                success: (ok) => {
                    if (!ok) throw new Error("Failed to add to sprint")
                    mutate((key: any) => Array.isArray(key) && key[0] === "backlogStories")
                    mutate((key: any) => Array.isArray(key) && key[0] === "sprintStories" && String(key[1]) === String(sprintId))
                    changeOpen(false)
                    return `"${story.subject}" added to sprint`
                },
                error: (err) => err?.message ?? "Failed to add to sprint",
            }
        )
    }

    return (
        <Dialog open={open} onOpenChange={changeOpen}>
            <DialogTrigger
                render={
                    <Button size="sm" variant="outline">
                        <IconTargetArrow /> Add to sprint
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
                            <Button variant="outline" className="h-8 text-xs" onClick={() => changeOpen(false)}>
                                Close
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col gap-4">
                            <div className="space-y-1">
                                <div className="text-[10px] opacity-60 font-medium">Sprint *</div>
                                
                                <Select value={sprintChoice} onValueChange={(v) => v != null && setSelectedSprintId(v)}>
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
                            <Button variant="outline" className="h-8 text-xs" onClick={() => changeOpen(false)}>
                                Cancel
                            </Button>
                            <Button className="h-8 text-xs" onClick={handleSubmit} disabled={!sprintChoice}>
                                Add to Sprint
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
