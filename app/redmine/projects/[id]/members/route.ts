import { NextRequest } from "next/server"

export async function GET(
    req: NextRequest,
    { params }: { params: any }
) {
    try {
        const apiKey = req.headers.get("x-api-key")
        const baseUrl = req.headers.get("x-base-url") || "https://kap01.kpit.com/kap"
        const { id: project_id } = await params

        const res = await fetch(
            `${baseUrl}/projects/${project_id}/memberships.json?limit=100`,
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
        else return Response.json({ memberships: [] })
    }
    catch (err) {
        return Response.json({ memberships: [] })
    }
}
