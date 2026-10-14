import { addDaysISO, isWeekend, toLocalISO, todayLocal } from "@/lib/date"

// Sprints are two weeks long and named <YY>_CW<week> after the ISO week they start in.
export const SPRINT_WEEKS = 2

const NAME_RE = /^(\d{2})_CW(\d{1,2})$/

// Monday of ISO week `week` in `year`.
const isoWeekMonday = (year: number, week: number) => {
  const jan4 = new Date(year, 0, 4)
  const mondayWeek1 = new Date(jan4)
  mondayWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  mondayWeek1.setDate(mondayWeek1.getDate() + (week - 1) * 7)
  return toLocalISO(mondayWeek1)
}

const parseName = (name?: string) => {
  const m = NAME_RE.exec(name ?? "")
  return m ? { year: 2000 + Number(m[1]), week: Number(m[2]) } : null
}

// Start/end of a sprint. Start comes from the name; end is the due date, or the
// Friday of the second week when no due date is set.
export const sprintWindow = (version: any): { start: string; end: string } | null => {
  const parsed = parseName(version?.name)
  if (parsed) {
    const start = isoWeekMonday(parsed.year, parsed.week)
    const end = version?.due_date ?? addDaysISO(start, SPRINT_WEEKS * 7 - 3)
    return { start, end }
  }
  if (version?.due_date) return { start: addDaysISO(version.due_date, -(SPRINT_WEEKS * 7 - 3)), end: version.due_date }
  return null
}

export const workdays = (start: string, end: string) => {
  const days: string[] = []
  for (let d = start; d <= end; d = addDaysISO(d, 1)) if (!isWeekend(d)) days.push(d)
  return days
}

// "Day 7 of 10" style progress through the sprint's working days.
export const sprintDayProgress = (version: any) => {
  const win = sprintWindow(version)
  if (!win) return null
  const days = workdays(win.start, win.end)
  const today = todayLocal()
  const elapsed = days.filter((d) => d <= today).length
  return { ...win, total: days.length, day: Math.min(elapsed, days.length) }
}

// Name and due date for the sprint after the latest one.
export const suggestNextSprint = (latest: any) => {
  const parsed = parseName(latest?.name)
  if (!parsed) return null
  let { year, week } = parsed
  week += SPRINT_WEEKS
  if (week > 52) {
    week -= 52
    year += 1
  }
  const start = isoWeekMonday(year, week)
  return {
    name: `${String(year % 100).padStart(2, "0")}_CW${String(week).padStart(2, "0")}`,
    due_date: addDaysISO(start, SPRINT_WEEKS * 7 - 3),
  }
}
