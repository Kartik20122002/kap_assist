"use client"

import { IconCircleCheck, IconAlertTriangle } from "@tabler/icons-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import BacklogEditStoryModal from "@/components/backlogEditStoryModal"
import BacklogAddToSprintModal, { getMissingFields } from "@/components/backlogAddToSprintModal"
import { StatusMenu } from "@/components/sprint/status-menu"
import { FeatureChip } from "@/components/sprint/feature-chip"
import { storyPoints } from "@/lib/health"
import { initials } from "@/lib/session"
import { cn } from "@/lib/utils"

export function BacklogRow({
  story,
  isAdmin,
  projectId,
  selected,
  onSelect,
}: {
  story: any
  isAdmin: boolean
  projectId: number
  selected: boolean
  onSelect: (checked: boolean) => void
}) {
  const missing = getMissingFields(story)
  const points = storyPoints(story)

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-xl border bg-card p-3 transition-colors lg:flex-row lg:items-center lg:gap-4",
        selected && "border-primary/50 bg-primary/5"
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {isAdmin && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
            className="mt-1 size-4 shrink-0 cursor-pointer accent-primary"
            aria-label={`Select #${story.id}`}
          />
        )}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div>
            <span className="mr-1.5 text-[11px] text-muted-foreground tabular-nums">#{story.id}</span>
            <span className="text-sm leading-snug font-medium">{story.subject}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FeatureChip story={story} canEdit={isAdmin} />
            {missing.length === 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                <IconCircleCheck className="size-3.5" /> Ready for sprint
              </span>
            ) : (
              <Tooltip>
                <TooltipTrigger
                  render={<span className="inline-flex cursor-default items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400" />}
                >
                  <IconAlertTriangle className="size-3.5" /> {missing.length} missing
                </TooltipTrigger>
                <TooltipContent>Missing: {missing.join(", ")}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-7 lg:pl-0">
        <StatusMenu issue={story} canEdit={isAdmin} />
        <span className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{points ?? "–"}</span> SP
        </span>
        <span className="w-14 text-xs text-muted-foreground tabular-nums">
          <span className="font-medium text-foreground">{story.estimated_hours ?? "–"}</span>h est
        </span>
        <Tooltip>
          <TooltipTrigger render={<span />}>
            <Avatar className="size-6">
              <AvatarFallback className="text-[10px]">{initials(story.assigned_to?.name)}</AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>{story.assigned_to?.name ?? "Unassigned"}</TooltipContent>
        </Tooltip>
        {isAdmin && (
          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <BacklogEditStoryModal story={story} />
            <BacklogAddToSprintModal story={story} projectId={projectId} />
          </div>
        )}
      </div>
    </div>
  )
}
