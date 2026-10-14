import { NextRequest } from "next/server"
import { redmineBase, redmineHeaders } from "@/lib/server/redmine"

/**
 * GET /redmine/issues — one page of issues with server-side filters.
 *
 * Every filter is sent in Redmine's f[]/op[]/v[] form. (Mixing f[] with the short
 * form, e.g. tracker_id=5, makes Redmine ignore the short ones — total_count and
 * paging would then include other trackers/statuses.)
 *
 * Query params:
 *   project_id   (required)
 *   tracker_id   e.g. 5
 *   status       open | closed | all          (default open)
 *   no_version   true → only issues without a sprint
 *   parent_id    direct children of an issue
 *   assigned_to  e.g. me
 *   q            text: "#123"/"123" matches the id, anything else the subject
 *   sort         Redmine sort, e.g. id:desc, updated_on:desc
 *   offset, limit (limit max 100)
 * Response: Redmine's { issues, total_count, offset, limit }
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const params = new URLSearchParams()
    const filter = (field: string, op: string, values: string[] = []) => {
      params.append("f[]", field)
      params.set(`op[${field}]`, op)
      for (const v of values) params.append(`v[${field}][]`, v)
    }

    const status = sp.get("status") ?? "open"
    filter("status_id", status === "closed" ? "c" : status === "all" ? "*" : "o")

    const tracker = sp.get("tracker_id")
    if (tracker) filter("tracker_id", "=", [tracker])

    if (sp.get("no_version") === "true") filter("fixed_version_id", "!*")

    const parent = sp.get("parent_id")
    if (parent) filter("parent_id", "=", [parent])

    const assignee = sp.get("assigned_to")
    if (assignee) filter("assigned_to_id", "=", [assignee])

    const q = (sp.get("q") ?? "").trim()
    if (q) {
      const id = /^#?(\d+)$/.exec(q)?.[1]
      if (id) filter("issue_id", "=", [id])
      else filter("subject", "~", [q])
    }

    params.set("project_id", sp.get("project_id") ?? "")
    params.set("sort", sp.get("sort") ?? "id:desc")
    params.set("offset", String(Math.max(0, Number(sp.get("offset") ?? 0) || 0)))
    params.set("limit", String(Math.min(100, Math.max(1, Number(sp.get("limit") ?? 25) || 25))))

    const res = await fetch(`${redmineBase(req)}/issues.json?${params}`, { headers: redmineHeaders(req) })
    if (res.status !== 200) {
      return Response.json({ issues: [], total_count: 0, error: await res.text() }, { status: res.status })
    }
    return Response.json(await res.json())
  } catch (err) {
    return Response.json({ issues: [], total_count: 0, error: "Failed to load issues" }, { status: 500 })
  }
}
