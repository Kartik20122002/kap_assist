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
import { createVersion, updateVersion } from "@/lib/api/sprint"
import { mutate } from "swr"
import { IconPlus, IconEdit } from "@tabler/icons-react"
import { toast } from "sonner"

interface VersionSprintModalProps {
    projectId: number
    mode: "create" | "update"
    version?: {
        id: number
        name: string
        description?: string
        status: string
        due_date?: string
    }
    onSuccess?: () => void
}

/**
 * Unified modal component for creating and updating versions/sprints
 * 
 * @component
 * @param {VersionSprintModalProps} props - Component props
 * @param {number} props.projectId - Project ID (required for create mode)
 * @param {"create" | "update"} props.mode - Modal mode (create or update)
 * @param {Object} props.version - Version object (required for update mode)
 * @param {Function} props.onSuccess - Optional callback after successful operation
 * 
 * @example
 * // Create mode
 * <VersionSprintModal projectId={123} mode="create" />
 * 
 * // Update mode
 * <VersionSprintModal 
 *   projectId={123} 
 *   mode="update" 
 *   version={versionData}
 *   onSuccess={() => refetch()}
 * />
 */
export default function VersionSprintModal({
    projectId,
    mode,
    version,
    onSuccess,
}: VersionSprintModalProps) {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState(version?.name || "")
    const [description, setDescription] = useState(version?.description || "")
    const [status, setStatus] = useState(version?.status || "open")
    const [dueDate, setDueDate] = useState(version?.due_date || "")

    // Reset form when modal opens/closes
    useEffect(() => {
        if (!open) {
        } else if (mode === "update" && version) {
            setName(version.name)
            setDescription(version.description || "")
            setStatus(version.status)
            setDueDate(version.due_date || "")
        }
    }, [open, mode, version])

    /**
     * Validates form inputs
     * @returns {string | null} Error message if validation fails, null otherwise
     */
    const validate = (dueValidate = true): string | null => {
        if (!name.trim()) return "Version name is required"
        if (dueValidate && dueDate && new Date(dueDate) < new Date()) {
            return "Due date cannot be in the past"
        }
        if (!["open", "locked", "closed"].includes(status)) {
            return "Invalid status selected"
        }
        return null
    }

    /**
     * Handles form submission for both create and update operations
     */
    const handleSubmit = () => {
        const due_validate = mode === "create"
        const validationError = validate(due_validate)
        if (validationError) {
            toast.error(validationError)
            return
        }

        const versionData = {
            name: name.trim(),
            status,
            ...(description && { description: description.trim() }),
            ...(dueDate && { due_date: dueDate }),
        }

        const operation =
            mode === "create"
                ? createVersion(projectId, versionData)
                : updateVersion(version!.id, versionData)

        toast.promise(operation, {
            loading: mode === "create" ? "Creating sprint…" : "Updating sprint…",
            success: () => {
                mutate(["sprints", projectId])
                if (mode === "update" && version) mutate(["sprint", version.id])
                setOpen(false)
                handleReset()
                onSuccess?.()
                return mode === "create" ? "Sprint created" : "Sprint updated"
            },
            error: (err) => err?.message ?? "Failed to save sprint",
        })
    }

    /**
     * Resets form to initial state
     */
    const handleReset = () => {
        if (mode === "create") {
            setName("")
            setDescription("")
            setStatus("open")
            setDueDate("")
        } else if (version) {
            setName(version.name)
            setDescription(version.description || "")
            setStatus(version.status)
            setDueDate(version.due_date || "")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    mode === "create" ? (
                        <Button size="sm" variant="secondary" className="h-7 px-3 text-xs gap-1">
                            <IconPlus className="size-3" />
                            Create Sprint
                        </Button>
                    ) : (
                        <Button size="sm" variant="secondary" className="h-6 px-4 text-[10px] gap-1">
                            <IconEdit className="size-3" />
                            Edit
                        </Button>
                    )
                }
            />

            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-6">
                <DialogHeader>
                    <DialogTitle className="text-sm">
                        {mode === "create" ? "Create New Version/Sprint" : "Update Version/Sprint"}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4">

                    {/* Name - Required */}
                    <div className="space-y-1">
                        <div className="text-[10px] opacity-60 font-medium">
                            Version Name <span className="text-red-500">*</span>
                        </div>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., v1.0.0 or Sprint 1"
                            className="h-8 text-xs"
                        />
                    </div>

                    {/* Description - Optional */}
                    <div className="space-y-1">
                        <div className="text-[10px] opacity-60 font-medium">Description</div>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add version/sprint description (optional)"
                            className="text-xs h-24 resize-none overflow-auto"
                        />
                    </div>

                    {/* Status - Required */}
                    <div className="space-y-1">
                        <div className="text-[10px] opacity-60 font-medium">
                            Status <span className="text-red-500">*</span>
                        </div>
                        {/* @ts-expect-error */}
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="locked">Locked</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Due Date - Optional */}
                    <div className="space-y-1">
                        <div className="text-[10px] opacity-60 font-medium">Due Date</div>
                        <Input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="h-8 text-xs"
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                    <Button
                        variant="outline"
                        onClick={handleReset}
                        className="h-8 text-xs"
                    >
                        Reset
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        className="h-8 text-xs"
                    >
                        {mode === "create" ? "Create Sprint" : "Update Sprint"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
