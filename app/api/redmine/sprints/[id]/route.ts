import { NextRequest } from "next/server"

/**
 * GET /api/redmine/sprints/[id]
 * Fetches a specific version/sprint by ID
 * 
 * Params:
 * - id: Version/Sprint ID (required)
 */
export async function GET(
    req: NextRequest,
    { params }: any
) {
    try {
        const apiKey = req.headers.get("x-api-key")
        const { id: sprintId } = await params

        const res = await fetch(
            `https://kap01.kpit.com/kap/versions/${sprintId}.json`,
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
        else return Response.json({ data: { version: {} } })
    }
    catch (err) {
        return Response.json({ data: { version: {} } })
    }
}

/**
 * PUT /api/redmine/sprints/[id]
 * Updates a specific version/sprint
 * 
 * Params:
 * - id: Version/Sprint ID (required)
 * 
 * Body:
 * {
 *   version: {
 *     name?: string,
 *     description?: string,
 *     status?: 'open' | 'locked' | 'closed',
 *     due_date?: string (YYYY-MM-DD)
 *   }
 * }
 * 
 * Returns:
 * - 204 No Content on success
 * - Error status code on failure
 */
export async function PUT(req: NextRequest, { params }: { params: any }) {
    try {
        const apiKey = req.headers.get("x-api-key")
        const { id: sprintId } = await params

        const body = await req.json()

        if (!body.version) {
            return Response.json(
                { error: "version object is required in request body" },
                { status: 400 }
            )
        }

        let url = `https://kap01.kpit.com/kap/versions/${sprintId}.json`

        const res = await fetch(url, {
            method: "PUT",
            headers: {
                "X-Redmine-API-Key": apiKey || "",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        })

        if (res.status === 204) {
            return new Response(null, { status: 204 })
        }

        return new Response(null, { status: res.status })

    } catch (err) {
        console.error("Error updating version:", err)
        return Response.json({ error: "Failed to parse body or fetch data" }, { status: 400 })
    }
}