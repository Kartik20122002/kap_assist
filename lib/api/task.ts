import { api } from "./client"
import { uploadAttachments, AttachmentInput } from "./file"

export const getTasks = async (parent_id: number) => {
  const res = await api.get(`/tasks?parent_id=${parent_id}`)
  return res?.data?.issues ?? []
}

/**
 * Creates a new task (tracker_id=6) in Redmine.
 *
 * @param issue   - Issue payload (project_id, subject, parent_issue_id, etc.)
 * @param files   - Optional array of { file, description? } attachments.
 *                  Files are uploaded one-by-one first; the resulting tokens
 *                  (with descriptions) are merged into the issue body as `uploads[]`.
 */
export const createTask = async (issue: any, files?: AttachmentInput[] | File[]) => {
  try {
    let uploads: any[] = []

    if (files && files.length > 0) {
      uploads = await uploadAttachments(files)
    }

    await api.post(`/issue`, {
      issue: {
        ...issue,
        ...(uploads.length > 0 ? { uploads } : {}),
      },
    })
    return true
  } catch (err) {
    console.log(err)
    return false
  }
}

/**
 * Updates an existing task in Redmine.
 *
 * @param task_id - Redmine issue ID
 * @param updates - Fields to update (status_id, estimated_hours, etc.)
 * @param files   - Optional array of { file, description? } attachments.
 *                  Files are uploaded one-by-one first; the resulting tokens
 *                  (with descriptions) are merged into the update body as `uploads[]`.
 *                  Existing attachments on the issue are NOT removed.
 */
export const updateTask = async (task_id: number, updates: any, files?: AttachmentInput[] | File[]) => {
  try {
    let uploads: any[] = []

    if (files && files.length > 0) {
      uploads = await uploadAttachments(files)
    }

    await api.put(`/issue/${task_id}`, {
      issue: {
        ...updates,
        ...(uploads.length > 0 ? { uploads } : {}),
      },
    })
    return true
  } catch (err) {
    console.log(err)
    return false
  }
}
