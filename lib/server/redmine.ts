import { NextRequest } from "next/server"

// Server-side helpers for the /redmine proxy routes.

export const redmineBase = (req: NextRequest) => req.headers.get("x-base-url") || "https://kap01.kpit.com/kap"

export const redmineHeaders = (req: NextRequest) => ({
  "X-Redmine-API-Key": req.headers.get("x-api-key") || "",
  "Content-Type": "application/json",
})

// Redmine returns at most 100 items per page; walk offset until total_count.
export const fetchAllPages = async (req: NextRequest, url: string, key: string, cap = 2000) => {
  const items: any[] = []
  let total = Infinity
  for (let offset = 0; offset < total && offset < cap; offset += 100) {
    const sep = url.includes("?") ? "&" : "?"
    const res = await fetch(`${url}${sep}limit=100&offset=${offset}`, { headers: redmineHeaders(req) })
    if (res.status !== 200) {
      if (offset === 0) return { ok: false as const, status: res.status, items }
      break
    }
    const data = await res.json()
    items.push(...(data[key] ?? []))
    total = data.total_count ?? items.length
  }
  return { ok: true as const, status: 200, items }
}
