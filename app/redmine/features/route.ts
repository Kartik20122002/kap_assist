import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key")
    const baseUrl = req.headers.get("x-base-url") || "https://kap01.kpit.com/kap"
    const projectId = req.nextUrl.searchParams.get("project_id")

    const url = `${baseUrl}/issues.json?tracker_id=2&project_id=${projectId}&status_id=*`

    const res = await fetch(url, {
      headers: {
        "X-Redmine-API-Key": apiKey || "",
        "Content-Type": "application/json",
      },
    })

    if (res.status === 200) {
      const data = await res.json()
      return Response.json(data)
    } else {
      return Response.json({ issues: [] })
    }
  } catch (err) {
    return Response.json({ issues: [] })
  }
}
