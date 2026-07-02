import { api } from "./client"

export const getFeatures = async (projectId: number) => {
  const res = await api.get(`/features?project_id=${projectId}`)
  return res?.data
}

export const createFeature = async (issue: any) => {
  try {
    await api.post(`/issue`, { issue })
    return true
  } catch (err) {
    console.log(err)
    return false
  }
}

export const updateFeature = async (issueId: number, updates: any) => {
  try {
    await api.put(`/issue/${issueId}`, { issue: updates })
    return true
  } catch (err) {
    console.log(err)
    return false
  }
}
