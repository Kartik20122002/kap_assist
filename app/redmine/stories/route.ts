import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key")
    const baseUrl = req.headers.get("x-base-url") || "https://kap01.kpit.com/kap"
    const project_id = req.nextUrl.searchParams.get("project_id")
    const assigned_to = req.nextUrl.searchParams.get("assigned_to")
    const fixed_version_id = req.nextUrl.searchParams.get("fixed_version_id")
    const no_version = req.nextUrl.searchParams.get("no_version")
    const offset = req.nextUrl.searchParams.get("offset")
    const limit = req.nextUrl.searchParams.get("limit")
    const status_filter = req.nextUrl.searchParams.get("status_filter")
    const tracker_id_filter = req.nextUrl.searchParams.get("tracker_id_filter")

    const statusParam = status_filter === "open" ? "open" : "*"
    const trackerParam = tracker_id_filter ?? "5"

    // ?project_id=${projectId}
    let url = `${baseUrl}/issues.json?tracker_id=${trackerParam}&include=relations&status_id=${statusParam}`

    if (project_id) url = url + `&project_id=${project_id}`
    if (no_version === "true") url = url + `&f[]=fixed_version_id&op[fixed_version_id]=!*`
    else if (fixed_version_id) url = url + `&fixed_version_id=${fixed_version_id}`
    if (assigned_to) url = url + `&assigned_to_id=${assigned_to}`
    if (offset) url = url + `&offset=${offset}`
    if (limit) url = url + `&limit=${limit}`

    const res = await fetch(
      url,
      {
        headers: {
          "X-Redmine-API-Key": apiKey || "",
          "Content-Type": "application/json",
        },
      }
    )


    if (res.status === 200) {
      const data = await res.json()
      return Response.json(data)
    }
    else return Response.json({ data: { issues: [] } })

  }
  catch (err) {
    return Response.json({ data: { issues: [] } })
  }
}