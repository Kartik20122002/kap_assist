import { NextRequest } from "next/server"

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const apiKey = req.headers.get("x-api-key")
        const { id: project_id } = await params

        const res = await fetch(
            `https://kap01.kpit.com/kap/projects/${project_id}.json?include=trackers,issue_categories,time_entry_activities`,
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
        else return Response.json({ data: { project: null } })

    }
    catch (err) {
        return Response.json([])
    }
}