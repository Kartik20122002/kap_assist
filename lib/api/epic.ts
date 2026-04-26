import { api } from "./client"

export const getEpics = async (projectId: number) => {
  const res = await api.get(`/epics?project_id=${projectId}`)
  return res?.data?.issues ?? []
}

export const getEpicById = async (id: string) => {
  const res = await api.get(`/issue/${id}`)
  return res?.data?.issue
}

export const getStoriesByEpicId = async (id: string, isAdmin = false) => {
  let url = `/stories?epic_id=${id}`
  if (!isAdmin) url = url + "&assigned_to=me"
  const res = await api.get(url)
  return res?.data?.issues ?? []
}