// Shared time-logging constants (quick log popover + time log dialog).

export const HOUR_PRESETS = ["0.5", "1", "3", "4.5", "6", "9"]

export const DAILY_TARGET_HOURS = 9

// Work category (cf 13 / time entry cf 46) → work type (cf 14 / cf 47)
export const CATEGORY_TYPE: Record<string, string> = {
  CODING: "WORK",
  PLANNING: "WORK",
  "UNIT TESTING": "WORK",
  "TEAM MEETING": "NA",
  MISCELLANEOUS: "NA",
  TRAINING: "NA",
}

export const CATEGORIES = Object.keys(CATEGORY_TYPE)

export const taskCategory = (task: any) => {
  const value = task?.custom_fields?.find((f: any) => f.id === 13)?.value
  return CATEGORY_TYPE[value] ? value : "CODING"
}
