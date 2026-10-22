import { NextRequest } from "next/server"
import { redmineBase, redmineHeaders } from "@/lib/server/redmine"

// PUT /redmine/journals/[id] — edit an existing note. Body: { journal: { notes } }
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const res = await fetch(`${redmineBase(req)}/journals/${encodeURIComponent(id)}.json`, {
      method: "PUT",
      headers: redmineHeaders(req),
      body: JSON.stringify(await req.json()),
    })
    if (res.status === 204 || res.status === 200) return new Response(null, { status: 204 })

    // Forward Redmine's error body so the UI can show the real reason
    const text = await res.text()
    return new Response(text || null, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
    })
  } catch (err) {
    return Response.json({ error: "Failed to update note" }, { status: 500 })
  }
}
