import { DONE_STATUSES, STATUS } from "@/lib/workflow"
import { todayLocal } from "@/lib/date"

// The old per-card warning toasts, as data. The sprint header shows them as
// one list, and each row shows a small marker instead of stacking toasts.

export type HealthItem = {
  issueId: number
  storyId: number
  level: "warn" | "error"
  text: string
}

const NOT_STARTED = new Set<number>([STATUS.NEW, STATUS.ASSIGNED])

const cf = (issue: any, id: number) => issue?.custom_fields?.find((f: any) => f.id === id)?.value ?? ""

export const taskSpent = (task: any) => Number(task?.spent_hours ?? 0)

export const storySpent = (story: any, tasks?: any[]) =>
  Number(story?.total_spent_hours ?? tasks?.reduce((s, t) => s + taskSpent(t), 0) ?? 0)

export const storyEstimate = (story: any) =>
  Number(story?.total_estimated_hours ?? story?.estimated_hours ?? 0)

export const storyPoints = (story: any) => {
  const raw = story?.rb_story_points ?? cf(story, 5)
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

export const healthForStory = (story: any, tasks: any[] | undefined): HealthItem[] => {
  const today = todayLocal()
  const items: HealthItem[] = []
  const statusId = story?.status?.id
  const done = DONE_STATUSES.has(statusId)
  const push = (issueId: number, level: HealthItem["level"], text: string) =>
    items.push({ issueId, storyId: story.id, level, text })

  if (!story.parent?.id) push(story.id, "error", "No feature set")
  if (!done && story.due_date && story.due_date < today) push(story.id, "error", `Past due (${story.due_date})`)
  if (!done && tasks && tasks.length === 0) push(story.id, "warn", "No tasks yet")
  if (!done && !String(cf(story, 72)).trim()) push(story.id, "warn", "No acceptance criteria")
  if (NOT_STARTED.has(statusId) && storySpent(story, tasks) > 0)
    push(story.id, "warn", `${storySpent(story, tasks)}h logged but still ${story.status?.name}`)

  for (const task of tasks ?? []) {
    const spent = taskSpent(task)
    const est = Number(task.estimated_hours ?? 0)
    const taskDone = task.status?.id === STATUS.COMPLETED || task.status?.id === STATUS.CLOSED
    if (est > 0 && spent > est) push(task.id, "warn", `Over estimate (${spent}h / ${est}h)`)
    if (NOT_STARTED.has(task.status?.id) && spent > 0) push(task.id, "warn", `${spent}h logged but still ${task.status?.name}`)
    if (!taskDone && task.due_date && task.due_date < today) push(task.id, "error", `Past due (${task.due_date})`)
  }
  return items
}
