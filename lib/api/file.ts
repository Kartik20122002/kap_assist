import { api } from "./client"

export interface AttachmentInput {
  file: File
  /** Optional description shown next to the attachment in Redmine */
  description?: string
}

export interface UploadResult {
  token: string
  filename: string
  content_type: string
  description?: string
}

/**
 * Uploads an array of attachments to Redmine one-by-one.
 *
 * Each file is POSTed to /api/redmine/uploads as multipart/form-data.
 * The route handler re-forwards the raw bytes to Redmine as
 * application/octet-stream and returns the upload token.
 *
 * The returned array can be spread directly into the `uploads` field of a
 * Redmine issue create (POST /issues.json) or update (PUT /issues/:id.json).
 *
 * @param attachments - Array of { file, description? } objects.
 *                      Accepts plain File[] too — description defaults to filename.
 * @returns Array of { token, filename, content_type, description } objects.
 * @throws  If any individual upload fails (non-201 response from Redmine).
 */
export const uploadAttachments = async (
  attachments: AttachmentInput[] | File[]
): Promise<UploadResult[]> => {
  const results: UploadResult[] = []

  // Normalise: accept both File[] and AttachmentInput[]
  const normalised: AttachmentInput[] = attachments.map((a) =>
    a instanceof File ? { file: a, description: a.name } : a
  )

  for (const { file, description } of normalised) {
    const formData = new FormData()
    formData.append("file", file)

    // Axios sets multipart/form-data + boundary automatically
    const res = await api.post("/uploads", formData)

    if (res.status !== 201) {
      throw new Error(`Failed to upload "${file.name}": ${res.data?.error ?? res.status}`)
    }

    results.push({
      token: res.data.token,
      filename: res.data.filename,
      content_type: res.data.content_type,
      // Redmine stores this as the attachment description
      ...(description ? { description } : {}),
    })
  }

  return results
}

