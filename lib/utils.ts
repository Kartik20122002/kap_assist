import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const statusStyles: any = {
  "New": "bg-emerald-500/20 text-gray-300",
  "Assigned": "bg-blue-500/20 text-blue-400",
  "In Progress": "bg-yellow-500/20 text-yellow-400",
  "Ready": "bg-violet-500/20 text-violet-400",
  "Ready for Testing": "bg-violet-500/20 text-violet-400",
  "Completed": "bg-green-500/20 text-green-400",
  "Implemented": "bg-teal-500/20 text-teal-400",
  "Closed": "bg-red-600/20 text-red-400",
  "Rejected": "bg-red-600/20 text-red-400",
}

export const ApiConfig = {
  refreshInterval: 120 * 1000,
  revalidateIfStale: false,
  revalidateOnFocus: false,
  keepPreviousData: false,
  revalidateOnReconnect: true
}

export const TASK_FLOW = [
  { id: 1, name: "New" },
  { id: 7, name: "Assigned" },
  { id: 2, name: "In Progress" },
  { id: 16, name: "Completed" },
  { id: 5, name: "Closed" }
]

export const TASK_RULES: any = {
  "In Progress": ["start_date"],
  "Completed": ["start_date"],
  "Closed": ["end_date"]
}

export const getNextTaskStatuses = (currentName: string) => {
  const idx = TASK_FLOW.findIndex((s: any) =>
    Array.isArray(s)
      ? s.some((x) => x.name === currentName)
      : s.name === currentName
  )

  const next = TASK_FLOW[idx + 1]

  if (!next) return []

  return Array.isArray(next) ? next : [next]
}

export const US_FLOW = [
  { id: 1, name: "New" },
  { id: 7, name: "Assigned" },
  { id: 8, name: "Ready" },
  { id: 2, name: "In Progress" },
  { id: 9, name: "Implemented" },
  { id: 5, name: "Closed" },
]

export const US_RULES: any = {
  "Ready": ["acceptance"],
  "In Progress": ["start_date"],
  "Closed": ["end_date", "final_size"]
}


export const getNextUSStatuses = (current: string) => {
  const idx = US_FLOW.findIndex((s) => s.name === current)

  const next = US_FLOW[idx + 1]

  if (!next) return []

  return [next]
}

export const FEATURE_FLOW = [
  { id: 1,  name: "New" },
  { id: 7,  name: "Assigned" },
  { id: 8,  name: "Ready" },
  { id: 2,  name: "In Progress" },
  { id: 9,  name: "Implemented" },
  { id: 5,  name: "Closed" },
]

export const getNextFeatureStatuses = (currentName: string) => {
  const idx = FEATURE_FLOW.findIndex((s) => s.name === currentName)
  const next = FEATURE_FLOW[idx + 1]
  if (!next) return []
  return [next]
}

// Bug tracker (id=15) status graph
const BUG_STATUS_MAP: Record<string, { id: number; name: string }> = {
  "New":         { id: 1,  name: "New" },
  "Reopened":    { id: 13, name: "Reopened" },
  "Assigned":    { id: 7,  name: "Assigned" },
  "In Progress": { id: 2,  name: "In Progress" },
  "Completed":   { id: 16, name: "Completed" },
  "Rejected":    { id: 6,  name: "Rejected" },
  "On Hold":     { id: 11, name: "On Hold" },
  "Closed":      { id: 5,  name: "Closed" },
}

const BUG_TRANSITIONS: Record<string, { id: number; name: string }[]> = {
  "New":         [{ id: 7,  name: "Assigned" }],
  "Reopened":    [{ id: 7,  name: "Assigned" }],
  "Assigned":    [{ id: 2,  name: "In Progress" }],
  "In Progress": [{ id: 16, name: "Completed" }, { id: 6, name: "Rejected" }, { id: 11, name: "On Hold" }],
  "On Hold":     [{ id: 7,  name: "Assigned" }, { id: 6, name: "Rejected" }],
  "Completed":   [{ id: 5,  name: "Closed" }],
  "Rejected":    [],
  "Closed":      [],
}

export const getBugStatusOptions = (currentName: string): { id: number; name: string }[] => {
  const current = BUG_STATUS_MAP[currentName]
  const nexts = BUG_TRANSITIONS[currentName] ?? []
  return current ? [current, ...nexts] : nexts
}