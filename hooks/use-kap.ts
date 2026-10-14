import useSWR from "swr"
import { ApiConfig } from "@/lib/utils"
import { getCurrentUser } from "@/lib/api/user"
import { getProjects } from "@/lib/api/project"
import { getSprints } from "@/lib/api/sprint"
import { getMyTimeEntriesBetween } from "@/lib/api/time"

export const useUser = () => useSWR(["user"], getCurrentUser, ApiConfig)

export const useProjects = () => useSWR(["projects"], getProjects, ApiConfig)

export const useSprints = (projectId?: number | null) =>
  useSWR(projectId ? ["sprints", projectId] : null, () => getSprints(projectId as number), ApiConfig)

// My time entries (all projects) between two local dates — drives the "Today" widget.
export const useMyEntriesBetween = (from?: string | null, to?: string | null) =>
  useSWR(from && to ? ["time_entries", "me", from, to] : null, () => getMyTimeEntriesBetween(from as string, to as string), ApiConfig)
