"use client"

import { useParams } from "next/navigation"
import { getProjectById, getProjetEpics } from "@/lib/api/project"
import useSWR from "swr"
import { useMemo } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ApiConfig } from "@/lib/utils"

export default function ProjectPage() {
    const { id } = useParams()

    const { data, isLoading } = useSWR(
        ["project-details", id],
        () => getProjectById(id as string),ApiConfig
    )

    const { data: epics } = useSWR(['project_epics', id, 'me'], () => getProjetEpics(id as string),ApiConfig)

    // const epicCount = useMemo(() => epics?.total_count ?? 0, [epics])
    const epicsList = useMemo(() => epics?.issues ?? [], [epics])

    if (isLoading) return <div className="p-4">Loading...</div>

    const project = data?.project
    if (!project?.name) return <div className="p-4">Loading Error</div>

    const hiddenFields = [
        "Time Entry OR-Code/WBS ID",
        "Teams URL",
        "Item Billable?",
        "H-Customizations",
        "Program Manager",
        "Business Leader",
    ]

    return (
        <div className="p-6 space-y-6">

            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold">{project?.name}</h1>
                <div className="text-sm text-muted-foreground">
                    ID: {project?.identifier}
                </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {project?.custom_fields?.filter((f: any) => !hiddenFields.includes(f.name))?.map((f: any) => (
                    <div
                        key={f.id}
                        className="rounded-xl bg-muted/50 p-3"
                    >
                        <div className="text-xs text-muted-foreground">
                            {f.name}
                        </div>
                        <div className="text-sm font-medium">
                            {f.value || "-"}
                        </div>
                    </div>
                ))}
            </div>

            {/* Epics placeholder */}
            <div className="space-y-3">
                <h2 className="text-lg font-semibold">Epics</h2>

                <div className="grid gap-3">
                    {epicsList.map((e: any) => (
                        <Link key={`epic:${id}`} href={`/app/epics/${e.id}`}>
                            <Card className="bg-muted/40 hover:bg-muted transition cursor-pointer">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        {e.subject}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="space-y-2 text-xs text-muted-foreground">
                                    <div className="flex items-center justify-between">
                                        <Badge variant="secondary">{e.status?.name}</Badge>
                                        <Badge variant="outline">{e.priority?.name}</Badge>
                                    </div>

                                    <div>
                                        Assigned: {e.assigned_to?.name || "Unassigned"}
                                    </div>

                                    <div>
                                        {e.start_date || "-"} → {e.due_date || "-"}
                                    </div>
                                </CardContent>
                            </Card></Link>
                    ))}
                </div>
            </div>

            {/* Time Activities */}
            <div className="space-y-3">
                <h2 className="text-lg font-semibold">Time Activities</h2>

                <div className="flex flex-wrap gap-2">
                    {project.time_entry_activities?.map((a: any) => (
                        <div
                            key={a.id}
                            className="px-3 py-1 rounded-full bg-muted text-sm"
                        >
                            {a.name}
                        </div>
                    ))}
                </div>
            </div>

            {/* Trackers (extra useful) */}
            <div className="space-y-3">
                <h2 className="text-lg font-semibold">Trackers</h2>

                <div className="flex flex-wrap gap-2">
                    {project.trackers?.map((t: any) => (
                        <div
                            key={t.id}
                            className="px-3 py-1 rounded-full bg-muted text-sm"
                        >
                            {t.name}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}