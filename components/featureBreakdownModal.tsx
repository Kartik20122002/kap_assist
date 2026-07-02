"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getFeatures } from "@/lib/api/feature"
import { ApiConfig } from "@/lib/utils"
import { IconLayoutGrid } from "@tabler/icons-react"

interface FeatureBreakdownModalProps {
    projectId: number
    stories: any[]
}

export default function FeatureBreakdownModal({ projectId, stories }: FeatureBreakdownModalProps) {
    const [open, setOpen] = useState(false)

    const { data: featuresData } = useSWR(
        open && projectId ? ["features", projectId] : null,
        () => getFeatures(projectId),
        ApiConfig
    )
    const features = useMemo(() => featuresData?.issues ?? [], [featuresData])

    const rows = useMemo(() => {
        const groups = new Map<string, { featureId: number | null; featureName: string | null; storyIds: number[]; members: Set<string> }>()

        for (const story of stories ?? []) {
            const featureId = story?.parent?.id ?? null
            const key = featureId !== null ? String(featureId) : "none"

            if (!groups.has(key)) {
                const feature = featureId !== null ? features.find((f: any) => f.id === featureId) : null
                groups.set(key, {
                    featureId,
                    featureName: feature?.subject ?? null,
                    storyIds: [],
                    members: new Set<string>(),
                })
            }

            const group = groups.get(key)!
            group.storyIds.push(story.id)
            if (story?.assigned_to?.name) group.members.add(story.assigned_to.name)
        }

        const withFeature = [...groups.values()]
            .filter((g) => g.featureId !== null)
            .sort((a, b) => (a.featureId as number) - (b.featureId as number))
        const noFeature = groups.get("none")

        return noFeature ? [...withFeature, noFeature] : withFeature
    }, [stories, features])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button size="sm" variant="secondary" className="h-7 px-3 text-xs gap-1">
                        <IconLayoutGrid className="size-3" />
                        Feature Breakdown
                    </Button>
                }
            />

            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-6 sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="text-sm">Feature Breakdown</DialogTitle>
                </DialogHeader>

                {rows.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-6 text-center">
                        No stories in this sprint.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-border/50 text-left text-muted-foreground">
                                    <th className="py-2 pr-3 font-medium">Feature</th>
                                    <th className="py-2 px-3 font-medium">Associated User Stories</th>
                                    <th className="py-2 pl-3 font-medium">Team Members</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row.featureId ?? "none"} className="border-b border-border/30 align-top">
                                        <td className="py-2 pr-3">
                                            <div className="font-medium">
                                                {row.featureId !== null ? (row.featureName ?? "Untitled Feature") : "No Feature"}
                                            </div>
                                            {row.featureId !== null && (
                                                <div className="text-[10px] text-muted-foreground">#{row.featureId}</div>
                                            )}
                                        </td>
                                        <td className="py-2 px-3">
                                            {row.storyIds.map((id) => `#${id}`).join(", ")}
                                        </td>
                                        <td className="py-2 pl-3">
                                            {[...row.members].join(", ") || "-"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
