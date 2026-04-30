import { api } from "./client"

export const getProjects = async () => {
  const res = await api.get("/projects")
  return res.data.projects
}

export const getProjectById = async (projectId: string) => {
  const res = await api.get(`/projects/${projectId}`)
  return res.data
}

export const getProjetEpics = async (projectId: string)=>{
  const res = await api.get(`/epics?project_id=${projectId}`)
  return res.data
}

export const getProjectMembers = async (projectId: number) => {
  const res = await api.get(`/projects/${projectId}/members`)
  // memberships can include groups — filter to only user memberships
  const memberships: any[] = res.data?.memberships ?? []
  return memberships
    .filter((m: any) => m.user)
    .map((m: any) => ({ id: m.user.id, name: m.user.name }))
}