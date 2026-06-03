import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key")
    const baseUrl = req.headers.get("x-base-url") || "https://kap01.kpit.com/kap"

    const res = await fetch(`${baseUrl}/users/current.json?include=memberships,groups`, {
      headers: {
        "X-Redmine-API-Key": apiKey || "",
        "Content-Type": "application/json",
      },
    })

    if(res.status === 200){
      const data = await res.json()
      return Response.json(data)
    }
    else return Response.json({ data: { user: null } })
  }
  catch (err) {
    return Response.json({ data: { user: null } })
  }
}