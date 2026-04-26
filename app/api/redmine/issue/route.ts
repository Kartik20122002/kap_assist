import { NextRequest } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const apiKey = req.headers.get("x-api-key")

        const body = await req.json()

        let url = `https://kap01.kpit.com/kap/issues.json`

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "X-Redmine-API-Key": apiKey || "",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        })

        const rs = await res.json()

        console.log(rs)

        return new Response(null, { status: res.status })

    } catch (err) {
        console.log(err)
        return Response.json({ error: "Failed to parse body or fetch data" }, { status: 400 })
    }
}