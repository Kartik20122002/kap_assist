import { NextRequest } from "next/server"

/**
 * POST /api/redmine/uploads
 *
 * Receives a single file as multipart/form-data (field name: "file"),
 * re-uploads it to Redmine as application/octet-stream, and returns the
 * upload token along with filename and content_type.
 *
 * Response (201):
 * {
 *   token: string,
 *   filename: string,
 *   content_type: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key")

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return Response.json({ error: "No file provided in form data" }, { status: 400 })
    }

    const filename = file.name
    const contentType = file.type || "application/octet-stream"

    // Read raw bytes — this is what Redmine expects as the body
    const bytes = await file.arrayBuffer()

    const redmineRes = await fetch(
      `https://kap01.kpit.com/kap/uploads.json?filename=${encodeURIComponent(filename)}`,
      {
        method: "POST",
        headers: {
          "X-Redmine-API-Key": apiKey || "",
          // MUST be application/octet-stream — Redmine rejects anything else
          "Content-Type": "application/octet-stream",
        },
        body: bytes,
      }
    )

    if (redmineRes.status === 201) {
      const data = await redmineRes.json()
      return Response.json(
        {
          token: data.upload.token,
          filename,
          content_type: contentType,
        },
        { status: 201 }
      )
    }

    // Surface Redmine's error (e.g. 422 for file too large)
    const errorText = await redmineRes.text()
    return Response.json(
      { error: `Redmine upload failed: ${errorText}` },
      { status: redmineRes.status }
    )
  } catch (err) {
    console.error("Upload route error:", err)
    return Response.json({ error: "Internal upload error" }, { status: 500 })
  }
}
