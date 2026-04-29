import { NextRequest } from "next/server"

/**
 * GET /api/redmine/sprints
 * Fetches all versions/sprints for a project
 * 
 * Query params:
 * - project_id: Project ID (required)
 */
export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key")
    const projectId = req.nextUrl.searchParams.get("project_id")

    let url = `https://kap01.kpit.com/kap/projects/${projectId}/versions.json`

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
    else return Response.json({ data: { versions: [] , total_count : 0 } })

  }
  catch (err) {
    return Response.json({ data: { versions: [], total_count : 0 } })
  }
}

/**
 * POST /api/redmine/sprints
 * Creates a new version/sprint in a project
 * 
 * Query params:
 * - project_id: Project ID (required)
 * 
 * Body:
 * {
 *   version: {
 *     name: string (required),
 *     description?: string,
 *     status?: 'open' | 'locked' | 'closed',
 *     due_date?: string (YYYY-MM-DD)
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key")
    const projectId = req.nextUrl.searchParams.get("project_id")

    if (!projectId) {
      return Response.json(
        { error: "project_id query parameter is required" },
        { status: 400 }
      )
    }

    const body = await req.json()

    if (!body.version?.name) {
      return Response.json(
        { error: "Version name is required" },
        { status: 400 }
      )
    }

    const url = `https://kap01.kpit.com/kap/projects/${projectId}/versions.json`

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-Redmine-API-Key": apiKey || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (res.status === 201) {
      const data = await res.json()
      return Response.json(data, { status: 201 })
    } else {
      const errorData = await res.text()
      return Response.json(
        { error: `Failed to create version: ${errorData}` },
        { status: res.status }
      )
    }
  } catch (err) {
    console.error("Error creating version:", err)
    return Response.json(
      { error: "Failed to parse body or create version" },
      { status: 400 }
    )
  }
}