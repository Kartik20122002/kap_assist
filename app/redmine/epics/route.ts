import { NextRequest } from "next/server"
import { fetchAllPages, redmineBase } from "@/lib/server/redmine"

// All epics (tracker 4) of a project, every page.
export async function GET(req: NextRequest) {
  try {
    const projectId = encodeURIComponent(req.nextUrl.searchParams.get("project_id") ?? "")
    const assignedTo = req.nextUrl.searchParams.get("assigned_to")
    let url = `${redmineBase(req)}/issues.json?tracker_id=4&project_id=${projectId}&status_id=*`
    if (assignedTo) url += `&assigned_to_id=${encodeURIComponent(assignedTo)}`

    const result = await fetchAllPages(req, url, "issues")
    if (!result.ok) return Response.json({ issues: [] }, { status: result.status })
    return Response.json({ issues: result.items, total_count: result.items.length })
  } catch (err) {
    return Response.json({ issues: [] }, { status: 500 })
  }
}
