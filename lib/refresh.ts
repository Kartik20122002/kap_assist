import { mutate } from "swr"

const SPRINT_KEYS = new Set(["sprintStories", "sprintTasks", "tasks", "sprint", "backlogStories"])

// Re-fetch everything the sprint screen shows (stories, tasks, sprint header).
export const refreshSprintData = () =>
  mutate((key: any) => Array.isArray(key) && SPRINT_KEYS.has(key[0]))

// After logging time: entries, plus task/story spent hours.
export const refreshTimeData = () =>
  mutate((key: any) => Array.isArray(key) && (key[0] === "time_entries" || SPRINT_KEYS.has(key[0])))
