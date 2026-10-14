"use client"

import { useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { IconChevronRight, IconStack3, IconPlus, IconCalendarEvent } from "@tabler/icons-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import EditFeatureModal from "@/components/editFeatureModal"
import { StoryFormDialog } from "@/components/forms/story-form-dialog"
import { StatusMenu } from "@/components/sprint/status-menu"
import { StatusPill } from "@/components/sprint/status-pill"
import { listIssues } from "@/lib/api/issues"
import { ApiConfig, cn } from "@/lib/utils"
import { DONE_STATUSES } from "@/lib/workflow"
import { storyPoints } from "@/lib/health"
import { formatShortDate } from "@/lib/date"
import { initials } from "@/lib/session"

const cf = (issue: any, id: number) => issue?.custom_fields?.find((f: any) => f.id === id)?.value ?? ""

export function FeatureRow({ feature, epicName, isAdmin }: { feature: any; epicName?: string; isAdmin: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [newStoryOpen, setNewStoryOpen] = useState(false)
  const projectId = feature.project?.id
  const size = cf(feature, 4)
  const uom = cf(feature, 6)

  // Child stories load when the row is opened
  const { data: children } = useSWR(
    expanded ? ["featureStories", feature.id] : null,
    () => listIssues({ projectId, trackerId: 5, parentId: feature.id, status: "all", sort: "id:desc", limit: 100 }),
    ApiConfig
  )
  const stories = children?.issues ?? []
  const done = stories.filter((s) => DONE_STATUSES.has(s.status?.id)).length

  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-start gap-2 p-2.5 sm:p-3">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? "Hide stories" : "Show stories"}
          className="shrink-0"
        >
          <IconChevronRight className={cn("transition-transform", expanded && "rotate-90")} />
        </Button>

        <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <button type="button" onClick={() => setExpanded((v) => !v)} className="block w-full text-left">
              <span className="mr-1.5 text-[11px] text-muted-foreground tabular-nums">#{feature.id}</span>
              <span className="text-sm leading-snug font-medium">{feature.subject}</span>
            </button>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              {feature.parent?.id ? (
                <span className="inline-flex max-w-72 items-center gap-1 rounded-full border px-2 py-0.5" title={epicName}>
                  <IconStack3 className="size-3 shrink-0 opacity-60" />
                  <span className="truncate">{epicName ?? `Epic #${feature.parent.id}`}</span>
                </span>
              ) : (
                <span className="rounded-full border border-amber-500/50 px-2 py-0.5 text-amber-700 dark:text-amber-400">No epic</span>
              )}
              {expanded && children && (
                <span className="tabular-nums">
                  {done}/{stories.length} stories done
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-1 lg:pl-0">
            <StatusMenu issue={feature} canEdit={isAdmin} />
            {size && (
              <Tooltip>
                <TooltipTrigger render={<span />}>
                  <Badge variant="secondary">{size}</Badge>
                </TooltipTrigger>
                <TooltipContent>T-shirt size{uom ? ` · ${uom}` : ""}</TooltipContent>
              </Tooltip>
            )}
            <span className="flex items-center gap-1 text-xs whitespace-nowrap text-muted-foreground">
              <IconCalendarEvent className="size-3.5" />
              {formatShortDate(feature.start_date)} – {formatShortDate(feature.due_date)}
            </span>
            <Tooltip>
              <TooltipTrigger render={<span />}>
                <Avatar className="size-6">
                  <AvatarFallback className="text-[10px]">{initials(feature.assigned_to?.name)}</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>{feature.assigned_to?.name ?? "Unassigned"}</TooltipContent>
            </Tooltip>
            {isAdmin && (
              <div className="ml-auto lg:ml-0">
                <EditFeatureModal feature={feature} />
              </div>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t px-2 py-1.5 sm:pl-12">
          {!children ? (
            <div className="space-y-1.5 p-1.5">
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-7 w-1/2" />
            </div>
          ) : (
            <>
              {stories.length === 0 && <div className="px-2 py-2 text-xs text-muted-foreground">No stories in this feature yet</div>}
              {stories.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2 hover:bg-muted/50">
                  <div className="w-32 shrink-0">
                    <StatusPill statusId={s.status?.id} name={s.status?.name} />
                  </div>
                  <span className="min-w-0 flex-1 basis-60 text-[13px] leading-snug">
                    <span className="mr-1.5 text-[11px] text-muted-foreground tabular-nums">#{s.id}</span>
                    {s.subject}
                  </span>
                  {s.fixed_version ? (
                    <Link href={`/app/sprints/${s.fixed_version.id}`} className="text-xs text-primary hover:underline">
                      {s.fixed_version.name}
                    </Link>
                  ) : (
                    <Link href="/app/backlog" className="text-xs text-muted-foreground hover:underline">
                      Backlog
                    </Link>
                  )}
                  <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">{storyPoints(s) ?? "–"} SP</span>
                  <Tooltip>
                    <TooltipTrigger render={<span />}>
                      <Avatar className="size-5">
                        <AvatarFallback className="text-[9px]">{initials(s.assigned_to?.name)}</AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>{s.assigned_to?.name ?? "Unassigned"}</TooltipContent>
                  </Tooltip>
                </div>
              ))}
              {isAdmin && (
                <div className="px-2 py-1.5">
                  <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setNewStoryOpen(true)}>
                    <IconPlus /> Add story to this feature
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {isAdmin && (
        <StoryFormDialog mode="create" projectId={projectId} defaultFeatureId={feature.id} open={newStoryOpen} onOpenChange={setNewStoryOpen} />
      )}
    </section>
  )
}
