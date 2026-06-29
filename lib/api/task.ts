import { api } from "./client"
import { uploadAttachments, AttachmentInput } from "./file"

export const getTasks = async (parent_id: number) => {
  const res = await api.get(`/tasks?parent_id=${parent_id}`)
  return res?.data?.issues ?? []
}

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
