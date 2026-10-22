import { todayLocal } from "@/lib/date"

export const ADMIN_ROLE_ID = 6

export const isProjectAdmin = (user: any, projectId?: number | null) =>
  !!projectId &&
  !!user?.memberships
    ?.find((m: any) => m.project?.id === projectId)
    ?.roles?.some((r: any) => r.id === ADMIN_ROLE_ID)

export const userDisplayName = (user: any) => (user ? `${user.firstname} ${user.lastname}` : "")

export const initials = (name?: string) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?"

// Sprint names are free text and ids aren't created in order, so sprints are
// ordered by end date (creation date when there is none), then id.
const sprintSortKey = (v: any) => String(v?.due_date ?? v?.created_on?.slice(0, 10) ?? "")

export const sortSprints = (versions: any[] = []) =>
  [...versions].sort((a, b) => sprintSortKey(a).localeCompare(sprintSortKey(b)) || a.id - b.id)

// Current sprint = first open sprint that hasn't ended yet; else the latest open
// one (all overdue); else the latest sprint.
export const pickCurrentSprint = (versions: any[] = []) => {
  const today = todayLocal()
  const sorted = sortSprints(versions)
  const open = sorted.filter((v) => v.status === "open")
  return open.find((v) => !v.due_date || v.due_date >= today) ?? open[open.length - 1] ?? sorted[sorted.length - 1]
}

const lastSprintKey = (projectId: number) => `lastSprint:${projectId}`

export const rememberSprint = (projectId: number, sprintId: number) => {
  try {
    localStorage.setItem(lastSprintKey(projectId), String(sprintId))
  } catch {}
}

// Sprint to open by default: the one last opened in this project, else the current one.
export const pickDefaultSprint = (projectId?: number | null, versions: any[] = []) => {
  let last: number | null = null
  try {
    if (projectId) last = Number(localStorage.getItem(lastSprintKey(projectId))) || null
  } catch {}
  return versions.find((v) => v.id === last) ?? pickCurrentSprint(versions)
}
