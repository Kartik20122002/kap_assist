import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key")
    const project_id = req.nextUrl.searchParams.get("project_id")
    const user_id = req.nextUrl.searchParams.get("user_id") ?? "me"

    let url = `https://kap01.kpit.com/kap/time_entries.json?user_id=${user_id}&project_id=${project_id}`

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
    else return Response.json({ data: { time_entries: [] } })

  }
  catch (err) {
    return Response.json({ data: { time_entries: [] } })
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key")

    const body = await req.json()

    let url = `https://kap01.kpit.com/kap/time_entries.json`

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-Redmine-API-Key": apiKey || "",
        "Content-Type": "application/json",
      },
      // 2. Forward the captured body to the external API
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const data = await res.json()
      return Response.json(data)
    }

    return Response.json({ data: null }, { status: res.status })

  } catch (err) {
    return Response.json({ error: "Failed to parse body or fetch data" }, { status: 400 })
  }
}
