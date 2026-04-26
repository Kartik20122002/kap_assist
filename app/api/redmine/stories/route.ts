import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key")
    const project_id = req.nextUrl.searchParams.get("project_id")
    const epic_id = req.nextUrl.searchParams.get("epic_id")
    const assigned_to = req.nextUrl.searchParams.get("assigned_to")

    let url = `https://kap01.kpit.com/kap/issues.json?tracker_id=5&include=relations`

    if(epic_id) url = url + `&epic_id=${epic_id}`
    if(project_id) url = url + `&project_id=${project_id}`
    if (assigned_to) url = url + `&assigned_to_id=${assigned_to}`

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