import { addDaysISO, isWeekend, mondayOf, todayLocal } from "@/lib/date"

// Sprints are two weeks long. Names are free text, so everything here comes from
// the due date (the sprint's last day); a sprint without one has no window.
export const SPRINT_WEEKS = 2

// Start = Monday of the first week, end = the due date.
export const sprintWindow = (version: any): { start: string; end: string } | null => {
  const end = version?.due_date
  if (!end) return null
  return { start: addDaysISO(mondayOf(end), -(SPRINT_WEEKS - 1) * 7), end }
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

// Due date for the sprint after the latest one; the name is left to the user.
export const suggestNextSprint = (latest: any) => {
  if (!latest?.due_date) return null
  return { due_date: addDaysISO(latest.due_date, SPRINT_WEEKS * 7) }
}
