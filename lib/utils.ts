import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const statusStyles: any = {
  "New": "bg-emerald-500/20 text-gray-300",
  "Assigned": "bg-blue-500/20 text-blue-400",
  "In Progress": "bg-yellow-500/20 text-yellow-400",
  "Completed": "bg-green-500/20 text-green-400",
  "Closed": "bg-red-600/20 text-emerald-400",
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
  { id: 5, name: "Closed" }
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