"use client"

import { useMemo, useState } from "react"
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useMyEntriesBetween, useSprints } from "@/hooks/use-kap"
import { addDaysISO, formatShortDate, mondayOf, parseLocal, todayLocal, weekdayShort } from "@/lib/date"
import { pickCurrentSprint } from "@/lib/session"
import { sprintWindow, workdays } from "@/lib/sprint"
import { DAILY_TARGET_HOURS } from "@/lib/time"
import { useProjectStore } from "@/store/projectStore"
import { cn } from "@/lib/utils"

const MAX_WEEKS_BACK = 8

const sumByDay = (entries: any[] | undefined) => {
  const map: Record<string, number> = {}
  for (const e of entries ?? []) map[e.spent_on] = (map[e.spent_on] ?? 0) + Number(e.hours ?? 0)
  return map
}

const round = (n: number) => Math.round(n * 100) / 100

// Today's hours vs target, the sprint total, and a week-by-week pager (Mon–Fri)
// so both weeks of the two-week sprint are readable in the narrow sidebar.
export function TodayWidget() {
  const today = todayLocal()
  const projectId = useProjectStore((s) => s.projectId)
  const { data: sprints } = useSprints(projectId)
  const sprint = sprintWindow(pickCurrentSprint(sprints?.versions))

  // 0 = this week, -1 = last week, …
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = addDaysISO(mondayOf(today), weekOffset * 7)
  const weekEnd = addDaysISO(weekStart, 4)

  // Sprint-to-date entries (also covers today) + the week being viewed
  const sprintFrom = sprint && sprint.start < today ? sprint.start : today
  const { data: sprintEntries } = useMyEntriesBetween(sprintFrom, today)
  const { data: weekEntries } = useMyEntriesBetween(weekStart, weekEnd)

  const sprintTotals = useMemo(() => sumByDay(sprintEntries), [sprintEntries])
  const weekTotals = useMemo(() => sumByDay(weekEntries), [weekEntries])

  const todayHours = round(sprintTotals[today] ?? 0)
  const sprintPast = sprint ? workdays(sprint.start, sprint.end).filter((d) => d <= today) : []
  const sprintHours = round(sprintPast.reduce((s, d) => s + (sprintTotals[d] ?? 0), 0))
  const sprintTarget = sprintPast.length * DAILY_TARGET_HOURS

  const days = workdays(weekStart, weekEnd).map((date) => ({
    date,
    hours: round(weekTotals[date] ?? 0),
    future: date > today,
  }))
  const weekHours = round(days.reduce((s, d) => s + d.hours, 0))
  const scale = Math.max(DAILY_TARGET_HOURS, ...days.map((d) => d.hours))

  // "Sprint week 1/2" when the viewed week falls inside the current sprint
  const sprintWeekIndex =
    sprint && weekStart >= mondayOf(sprint.start) && weekStart <= sprint.end
      ? Math.round((parseLocal(weekStart).getTime() - parseLocal(mondayOf(sprint.start)).getTime()) / (7 * 86_400_000)) + 1
      : null
  const sprintWeeks = sprint
    ? Math.round((parseLocal(mondayOf(sprint.end)).getTime() - parseLocal(mondayOf(sprint.start)).getTime()) / (7 * 86_400_000)) + 1
    : 0

  return (
    <div className="space-y-3 rounded-lg border bg-sidebar-accent/40 p-3">
      {/* Today */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] text-muted-foreground">Logged today</span>
          <span className="text-xs tabular-nums">
            <span className={cn("text-base font-semibold", todayHours >= DAILY_TARGET_HOURS && "text-emerald-600 dark:text-emerald-400")}>
              {sprintEntries === undefined ? "–" : todayHours}
            </span>
            <span className="text-muted-foreground"> / {DAILY_TARGET_HOURS}h</span>
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", todayHours >= DAILY_TARGET_HOURS ? "bg-emerald-500" : "bg-primary")}
            style={{ width: `${Math.min(100, (todayHours / DAILY_TARGET_HOURS) * 100)}%` }}
          />
        </div>
        {sprint && (
          <div className="flex items-baseline justify-between text-[11px]">
            <span className="text-muted-foreground">Sprint so far</span>
            <span className={cn("tabular-nums", sprintHours < sprintTarget ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
              {sprintHours} / {sprintTarget}h
            </span>
          </div>
        )}
      </div>

      {/* Week pager */}
      <div className="space-y-2 border-t pt-2.5">
        <div className="flex items-center justify-between gap-1">
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => setWeekOffset((w) => w - 1)}
            disabled={weekOffset <= -MAX_WEEKS_BACK}
            aria-label="Previous week"
          >
            <IconChevronLeft />
          </Button>
          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            className="min-w-0 flex-1 text-center leading-tight"
            title="Back to this week"
          >
            <span className="block text-[11px] font-medium">
              {sprintWeekIndex ? `Sprint week ${sprintWeekIndex}/${sprintWeeks}` : weekOffset === 0 ? "This week" : "Week"}
            </span>
            <span className="block text-[10px] text-muted-foreground">
              {formatShortDate(weekStart)} – {formatShortDate(weekEnd)} · {weekHours}h
            </span>
          </button>
          <Button size="icon-xs" variant="ghost" onClick={() => setWeekOffset((w) => w + 1)} disabled={weekOffset >= 1} aria-label="Next week">
            <IconChevronRight />
          </Button>
        </div>

        <div className="flex h-20 items-end gap-1.5">
          {days.map((d) => (
            <Tooltip key={d.date}>
              <TooltipTrigger render={<div className="flex h-full flex-1 flex-col items-center justify-end gap-1" />}>
                <span className={cn("text-[10px] tabular-nums", d.future ? "text-transparent" : "text-muted-foreground")}>
                  {d.hours}
                </span>
                <div
                  className={cn(
                    "w-full rounded-sm",
                    d.future
                      ? "border border-dashed border-muted-foreground/25"
                      : d.hours === 0
                        ? "bg-destructive/30"
                        : d.hours >= DAILY_TARGET_HOURS
                          ? "bg-emerald-500/70"
                          : "bg-primary/60",
                    d.date === today && "ring-1 ring-primary"
                  )}
                  style={{ height: d.future ? "70%" : `${Math.max(6, (d.hours / scale) * 70)}%` }}
                />
              </TooltipTrigger>
              <TooltipContent>
                {weekdayShort(d.date)} {formatShortDate(d.date)} · {d.future ? "upcoming" : `${d.hours}h of ${DAILY_TARGET_HOURS}h`}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <div className="flex gap-1.5 text-center text-[10px] text-muted-foreground">
          {days.map((d) => (
            <span key={d.date} className={cn("flex-1 leading-tight", d.date === today && "font-semibold text-foreground")}>
              {weekdayShort(d.date).slice(0, 2)}
              <span className="block text-[9px] opacity-70">{parseLocal(d.date).getDate()}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
