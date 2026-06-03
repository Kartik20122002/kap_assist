import { NextRequest } from "next/server"

export async function GET(
    req: NextRequest,
    { params }: any
) {
    try {
        const apiKey = req.headers.get("x-api-key")
        const baseUrl = req.headers.get("x-base-url") || "https://kap01.kpit.com/kap"
        const { id: issueId } = await params

        const res = await fetch(
            `${baseUrl}/issues/${issueId}.json?include=children,journals,relations,allowed_statuses`,
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
        else return Response.json({ data: { issue: {} } })
    }
    catch (err) {
        return Response.json({ data: { issue: {} } })
    }
}

export async function PUT(req: NextRequest, { params }: { params: any }) {
    try {
        const apiKey = req.headers.get("x-api-key")
        const baseUrl = req.headers.get("x-base-url") || "https://kap01.kpit.com/kap"
        const { id: issueId } = await params

        const body = await req.json()

        let url = `${baseUrl}/issues/${issueId}.json`

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
        return Response.json({ error: "Failed to parse body or fetch data" }, { status: 400 })
    }
}