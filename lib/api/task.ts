import { api } from "./client"

export const getTasks = async (parent_id: number) => {
  const res = await api.get(`/tasks?parent_id=${parent_id}`)
  return res?.data?.issues ?? []
}

export const createTask = async (issue: any) => {
  try {
    await api.post(`/issue`, {
      issue
    })
    return true
  }
  catch (err) {
    console.log(err)
    return false
  }
}

export const updateTask = async (task_id: number, updates: any) => {
  try {
    const res = await api.put(`/issue/${task_id}`, {
      issue: updates
    })
    return true
  }
  catch (err) {
    console.log(err)
    return false
  }
}
