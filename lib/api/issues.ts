import { api } from "./client"

export type IssueQuery = {
  projectId: number
  trackerId?: number
  status?: "open" | "closed" | "all"
  noVersion?: boolean
  parentId?: number
  assignedTo?: string
  q?: string
  sort?: string
  offset?: number
  limit?: number
}

export type IssuePage = { issues: any[]; total_count: number; offset: number; limit: number }

// One server-side page (see app/redmine/issues/route.ts)
export const listIssues = async (query: IssueQuery): Promise<IssuePage> => {
  const params = new URLSearchParams({ project_id: String(query.projectId) })
  if (query.trackerId) params.set("tracker_id", String(query.trackerId))
  if (query.status) params.set("status", query.status)
  if (query.noVersion) params.set("no_version", "true")
  if (query.parentId) params.set("parent_id", String(query.parentId))
  if (query.assignedTo) params.set("assigned_to", query.assignedTo)
  if (query.q?.trim()) params.set("q", query.q.trim())
  if (query.sort) params.set("sort", query.sort)
  params.set("offset", String(query.offset ?? 0))
  params.set("limit", String(query.limit ?? 25))

  const res = await api.get(`/issues?${params}`)
  return {
    issues: res.data?.issues ?? [],
    total_count: res.data?.total_count ?? 0,
    offset: res.data?.offset ?? query.offset ?? 0,
    limit: res.data?.limit ?? query.limit ?? 25,
  }
}
