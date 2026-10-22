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

// Issue with journals (notes), children, relations and allowed_statuses
export const getIssue = async (id: number) => {
  const res = await api.get(`/issue/${id}`)
  return res?.data?.issue ?? null
}

export const updateJournal = async (journalId: number, notes: string) => {
  try {
    await api.put(`/journals/${journalId}`, { journal: { notes } })
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
