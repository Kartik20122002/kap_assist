import { NextRequest } from "next/server"
import { fetchAllPages, redmineBase } from "@/lib/server/redmine"

// All features (tracker 2) of a project, every page — used by pickers and lookups.
export async function GET(req: NextRequest) {
  try {
    const projectId = encodeURIComponent(req.nextUrl.searchParams.get("project_id") ?? "")
    const result = await fetchAllPages(req, `${redmineBase(req)}/issues.json?tracker_id=2&project_id=${projectId}&status_id=*`, "issues")
    if (!result.ok) return Response.json({ issues: [] }, { status: result.status })
    return Response.json({ issues: result.items, total_count: result.items.length })
  } catch (err) {
    return Response.json({ issues: [] }, { status: 500 })
  }
}
