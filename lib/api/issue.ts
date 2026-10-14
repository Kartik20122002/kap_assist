import { api } from "./client"
import { uploadAttachments, AttachmentInput } from "./file"
import { extractError } from "@/lib/workflow"

// Create/update that throw with KAP's real error message (unlike the older
// boolean-returning helpers in story.ts / task.ts).

const withUploads = async (issue: any, files?: AttachmentInput[]) => {
  if (!files?.length) return issue
  const uploads = await uploadAttachments(files)
  return { ...issue, uploads }
}

export const createIssue = async (issue: any, files?: AttachmentInput[]) => {
  try {
    await api.post(`/issue`, { issue: await withUploads(issue, files) })
  } catch (err) {
    throw new Error(extractError(err))
  }
}

export const updateIssue = async (id: number, issue: any, files?: AttachmentInput[]) => {
  try {
    await api.put(`/issue/${id}`, { issue: await withUploads(issue, files) })
  } catch (err) {
    throw new Error(extractError(err))
  }
}
