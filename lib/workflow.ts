import { api } from "@/lib/api/client"
import { defaultEndDate, todayLocal } from "@/lib/date"

// Single source of truth for statuses, chains and per-step rules.
// See features.md §0 (L1–L3) for the locked behaviour.

export const STATUS = {
  NEW: 1,
  IN_PROGRESS: 2,
  CLOSED: 5,
  REJECTED: 6,
  ASSIGNED: 7,
  READY: 8,
  IMPLEMENTED: 9,
  ON_HOLD: 11,
  NEED_INFO: 12,
  REOPENED: 13,
  COMPLETED: 16,
} as const

export const STATUS_NAME: Record<number, string> = {
  1: "New",
  2: "In Progress",
  5: "Closed",
  6: "Rejected",
  7: "Assigned",
  8: "Ready",
  9: "Implemented",
  11: "On Hold",
  12: "Need Info",
  13: "Reopened",
  16: "Completed",
}

export const TRACKER = { FEATURE: 2, STORY: 5, TASK: 6 } as const

const STORY_CHAIN = [STATUS.NEW, STATUS.ASSIGNED, STATUS.READY, STATUS.IN_PROGRESS, STATUS.IMPLEMENTED, STATUS.CLOSED]
const TASK_CHAIN = [STATUS.NEW, STATUS.ASSIGNED, STATUS.IN_PROGRESS, STATUS.COMPLETED, STATUS.CLOSED]

// L3: not handled by Status Jump, shown read-only.
const SIDE_STATES = new Set<number>([STATUS.ON_HOLD, STATUS.NEED_INFO, STATUS.REJECTED])

export const DONE_STATUSES = new Set<number>([STATUS.IMPLEMENTED, STATUS.COMPLETED, STATUS.CLOSED, STATUS.REJECTED])
export const ACTIVE_STATUSES = new Set<number>([STATUS.IN_PROGRESS, STATUS.ON_HOLD, STATUS.NEED_INFO])

export type StatusTone = "todo" | "active" | "done" | "closed" | "blocked"

export const statusTone = (id?: number): StatusTone => {
  if (id === STATUS.CLOSED) return "closed"
  if (id === STATUS.ON_HOLD || id === STATUS.NEED_INFO || id === STATUS.REJECTED) return "blocked"
  if (id === STATUS.IN_PROGRESS) return "active"
  if (id === STATUS.IMPLEMENTED || id === STATUS.COMPLETED) return "done"
  return "todo"
}

const chainFor = (trackerId?: number) => (trackerId === TRACKER.TASK ? TASK_CHAIN : STORY_CHAIN)

const cf = (issue: any, id: number) => issue?.custom_fields?.find((f: any) => f.id === id)?.value ?? ""

export const isSideState = (statusId?: number) => statusId !== undefined && SIDE_STATES.has(statusId)

export const canReopen = (issue: any) =>
  issue?.tracker?.id !== TRACKER.TASK && issue?.status?.id === STATUS.CLOSED

// Index in the chain the issue currently sits at. Reopened sits just before Assigned (L2).
const positionOf = (issue: any) => {
  const chain = chainFor(issue?.tracker?.id)
  const statusId = issue?.status?.id
  if (statusId === STATUS.REOPENED) return chain.indexOf(STATUS.ASSIGNED) - 1
  return chain.indexOf(statusId)
}

// L1: only the statuses ahead of the current one, up to Closed.
export const forwardTargets = (issue: any) => {
  if (isSideState(issue?.status?.id)) return []
  const chain = chainFor(issue?.tracker?.id)
  const pos = positionOf(issue)
  if (pos < 0) return []
  return chain.slice(pos + 1).map((id) => ({ id, name: STATUS_NAME[id] }))
}

export const pathTo = (issue: any, targetId: number) => {
  const targets = forwardTargets(issue)
  const idx = targets.findIndex((s) => s.id === targetId)
  return idx === -1 ? [] : targets.slice(0, idx + 1)
}

// Fields each step must carry so KAP accepts it and data stays consistent.
const fieldsForStep = (issue: any, statusId: number, ctx: JumpContext) => {
  const isTask = issue?.tracker?.id === TRACKER.TASK
  const today = todayLocal()
  const fields: any = { status_id: statusId }
  const customFields: { id: number; value: string }[] = []

  if (statusId === STATUS.IN_PROGRESS) {
    const start = issue.start_date || today
    if (!issue.start_date) fields.start_date = start
    if (!issue.due_date) fields.due_date = defaultEndDate(start)
    if (!cf(issue, 43)) customFields.push({ id: 43, value: start })
  }

  if (statusId === STATUS.COMPLETED || (isTask && statusId === STATUS.CLOSED)) {
    fields.done_ratio = 100
    fields.remaining_hours = 0
  }

  if (statusId === STATUS.CLOSED) {
    const start = issue.start_date || today
    const end = issue.due_date || defaultEndDate(start)
    if (!issue.due_date) fields.due_date = end
    if (!cf(issue, 44)) customFields.push({ id: 44, value: end })
    if (!isTask && !cf(issue, 8) && ctx.storyPoints) customFields.push({ id: 8, value: String(ctx.storyPoints) })
  }

  if (customFields.length) fields.custom_fields = customFields
  return fields
}

export type JumpContext = {
  storyPoints?: number | null
  openChildTasks?: number
}

// Problems that must be fixed before the first call (dry run).
export const preflight = (issue: any, targetId: number, ctx: JumpContext = {}) => {
  const steps = pathTo(issue, targetId)
  const problems: string[] = []
  const isTask = issue?.tracker?.id === TRACKER.TASK

  if (!isTask && issue?.tracker?.id === TRACKER.STORY && !issue.parent?.id)
    problems.push("Set a feature on this story first")
  if (!steps.length) problems.push(`Can't move from ${issue?.status?.name} to ${STATUS_NAME[targetId]}`)
  for (const step of steps) {
    if (step.id === STATUS.ASSIGNED && !issue.assigned_to?.id) problems.push("Assign someone first")
    if (step.id === STATUS.READY && !cf(issue, 72).trim()) problems.push("Add acceptance criteria before Ready")
    if (!isTask && step.id === STATUS.CLOSED && (ctx.openChildTasks ?? 0) > 0)
      problems.push(`${ctx.openChildTasks} task(s) still open — close them first`)
  }
  return { steps, problems: [...new Set(problems)] }
}

export const extractError = (err: any) => {
  const errors = err?.response?.data?.errors
  if (Array.isArray(errors) && errors.length) return errors.join(", ")
  if (typeof err?.response?.data?.error === "string") return err.response.data.error
  return err?.message ?? "Unknown error"
}

const fetchIssue = async (id: number) => {
  const res = await api.get(`/issue/${id}`)
  const issue = res?.data?.issue
  if (!issue?.id) throw new Error(`Could not load #${id}`)
  return issue
}

export class JumpError extends Error {
  reached: string
  constructor(message: string, reached: string) {
    super(message)
    this.reached = reached
  }
}

// Walks the issue forward one status at a time. Before each step the live
// allowed_statuses are checked; the walk stops at the first failure.
export const runStatusJump = async (
  issue: any,
  targetId: number,
  ctx: JumpContext = {},
  onStep?: (stepName: string, index: number, total: number) => void
) => {
  const { steps, problems } = preflight(issue, targetId, ctx)
  if (problems.length) throw new JumpError(problems.join(" · "), issue.status?.name)

  let current = issue
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    onStep?.(step.name, i + 1, steps.length)

    current = await fetchIssue(issue.id)
    const allowed: any[] = current.allowed_statuses ?? []
    if (allowed.length && !allowed.some((s) => s.id === step.id)) {
      throw new JumpError(`KAP doesn't allow ${current.status?.name} → ${step.name} for you`, current.status?.name)
    }

    try {
      await api.put(`/issue/${issue.id}`, { issue: fieldsForStep(current, step.id, ctx) })
    } catch (err) {
      throw new JumpError(extractError(err), current.status?.name)
    }
  }
  return steps[steps.length - 1]
}

// L2: Closed → Reopened, with the reason KAP tracks for going back.
export const reopenIssue = async (issue: any, reason: string) => {
  try {
    await api.put(`/issue/${issue.id}`, {
      issue: {
        status_id: STATUS.REOPENED,
        custom_fields: [
          { id: 2038, value: reason },
          { id: 1942, value: todayLocal() },
        ],
      },
    })
  } catch (err) {
    throw new Error(extractError(err))
  }
}
