import { NextRequest } from "next/server"

// All features (tracker 2) of a project, every page — Redmine caps a page at 100.
export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key")
    const baseUrl = req.headers.get("x-base-url") || "https://kap01.kpit.com/kap"
    const projectId = req.nextUrl.searchParams.get("project_id")

    const issues: any[] = []
    let total = Infinity
    for (let offset = 0; offset < total && offset < 2000; offset += 100) {
      const url = `${baseUrl}/issues.json?tracker_id=2&project_id=${encodeURIComponent(projectId ?? "")}&status_id=*&limit=100&offset=${offset}`
      const res = await fetch(url, {
        headers: {
          "X-Redmine-API-Key": apiKey || "",
          "Content-Type": "application/json",
        },
      })
      if (res.status !== 200) {
        if (offset === 0) return Response.json({ issues: [] }, { status: res.status })
        break
      }
      const data = await res.json()
      issues.push(...(data.issues ?? []))
      total = data.total_count ?? issues.length
    }

    return Response.json({ issues, total_count: issues.length })
  } catch (err) {
    return Response.json({ issues: [] }, { status: 500 })
  }
}
