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

// KAP sprint names are <year>_CW<week>, so name order is chronological.
export const sortSprints = (versions: any[] = []) =>
  [...versions].sort((a, b) => String(a.name).localeCompare(String(b.name)))

// Current sprint = first open sprint by name; falls back to the latest one.
export const pickCurrentSprint = (versions: any[] = []) => {
  const sorted = sortSprints(versions)
  return sorted.find((v) => v.status === "open") ?? sorted[sorted.length - 1]
}
