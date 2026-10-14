"use client"

import { IconAlertTriangle, IconCircleCheck } from "@tabler/icons-react"
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import type { HealthItem } from "@/lib/health"
import { cn } from "@/lib/utils"

function Stat({ label, value, total, unit = "" }: { label: string; value: number; total: number; unit?: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0
  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-xs tabular-nums">
          <span className="font-semibold">
            {Number.isInteger(value) ? value : value.toFixed(1)}
            {unit}
          </span>
          <span className="text-muted-foreground">
            {" "}
            / {Number.isInteger(total) ? total : total.toFixed(1)}
            {unit}
          </span>
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full bg-primary transition-all", unit === "h" && value > total && total > 0 && "bg-amber-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function SprintStats({
  storiesDone,
  storiesTotal,
  pointsDone,
  pointsTotal,
  hoursSpent,
  hoursEstimated,
  health,
  subjects,
  onFocus,
}: {
  storiesDone: number
  storiesTotal: number
  pointsDone: number
  pointsTotal: number
  hoursSpent: number
  hoursEstimated: number
  health: HealthItem[]
  subjects: Record<number, string>
  onFocus: (storyId: number) => void
}) {
  const errors = health.filter((h) => h.level === "error").length

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:gap-6">
      <div className="grid flex-1 grid-cols-3 gap-4 sm:gap-6">
        <Stat label="Stories done" value={storiesDone} total={storiesTotal} />
        <Stat label="Points done" value={pointsDone} total={pointsTotal} />
        <Stat label="Hours" value={hoursSpent} total={hoursEstimated} unit="h" />
      </div>

      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className={cn(
                "shrink-0 gap-1.5",
                health.length > 0 && (errors ? "text-destructive" : "text-amber-600 dark:text-amber-400")
              )}
              disabled={health.length === 0}
            />
          }
        >
          {health.length === 0 ? (
            <>
              <IconCircleCheck className="text-emerald-500" /> All good
            </>
          ) : (
            <>
              <IconAlertTriangle /> {health.length} to check
            </>
          )}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-96 gap-2 p-0">
          <PopoverHeader className="px-3 pt-3">
            <PopoverTitle>Needs attention</PopoverTitle>
          </PopoverHeader>
          <div className="max-h-80 overflow-y-auto px-1.5 pb-1.5">
            {health.map((h, i) => (
              <button
                key={`${h.issueId}-${i}`}
                type="button"
                onClick={() => onFocus(h.storyId)}
                className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
              >
                <IconAlertTriangle
                  className={cn("mt-0.5 size-3.5 shrink-0", h.level === "error" ? "text-destructive" : "text-amber-500")}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs">{h.text}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    #{h.issueId} {subjects[h.issueId]}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
