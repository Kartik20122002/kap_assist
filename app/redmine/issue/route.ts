import { NextRequest } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const apiKey = req.headers.get("x-api-key")
        const baseUrl = req.headers.get("x-base-url") || "https://kap01.kpit.com/kap"

        const body = await req.json()

        let url = `${baseUrl}/issues.json`

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "X-Redmine-API-Key": apiKey || "",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        })

        if (res.ok) return new Response(null, { status: res.status })

        // Forward Redmine's error body ({ errors: [...] }) so the UI can show the real reason
        const text = await res.text()
        return new Response(text || null, {
            status: res.status,
            headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
        })

    } catch (err) {
        console.log(err)
        return Response.json({ error: "Failed to parse body or fetch data" }, { status: 400 })
    }
}