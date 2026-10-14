import { mutate } from "swr"

// Every list that shows issues, so a status change or edit shows up wherever you are
const SPRINT_KEYS = new Set(["sprintStories", "sprintTasks", "tasks", "sprint", "backlogStories", "featurePage", "featureStories", "features"])

// Re-fetch everything the sprint screen shows (stories, tasks, sprint header).
export const refreshSprintData = () =>
  mutate((key: any) => Array.isArray(key) && SPRINT_KEYS.has(key[0]))

// After logging time: entries, plus task/story spent hours.
export const refreshTimeData = () =>
  mutate((key: any) => Array.isArray(key) && (key[0] === "time_entries" || SPRINT_KEYS.has(key[0])))
