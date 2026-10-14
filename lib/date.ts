// All "today" logic uses the user's local calendar day, never UTC.

const pad = (n: number) => String(n).padStart(2, "0")

export const toLocalISO = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const todayLocal = () => toLocalISO(new Date())

export const daysAgoLocal = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toLocalISO(d)
}

// Parses "YYYY-MM-DD" as a local date (new Date("YYYY-MM-DD") would be UTC).
export const parseLocal = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export const addDaysISO = (iso: string, n: number) => {
  const d = parseLocal(iso)
  d.setDate(d.getDate() + n)
  return toLocalISO(d)
}

// Rule: a missing end date is one week after the start date.
export const defaultEndDate = (startISO: string) => addDaysISO(startISO, 7)

// Monday of the week containing `iso`
export const mondayOf = (iso: string) => {
  const day = parseLocal(iso).getDay()
  return addDaysISO(iso, -((day + 6) % 7))
}

export const isWeekend =(iso: string) => {
  const day = parseLocal(iso).getDay()
  return day === 0 || day === 6
}

export const daysBetween = (fromISO: string, toISO: string) =>
  Math.round((parseLocal(toISO).getTime() - parseLocal(fromISO).getTime()) / 86_400_000)

export const formatShortDate = (iso?: string | null) => {
  if (!iso) return "—"
  return parseLocal(iso.slice(0, 10)).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

export const weekdayShort = (iso: string) =>
  parseLocal(iso).toLocaleDateString("en-GB", { weekday: "short" })
