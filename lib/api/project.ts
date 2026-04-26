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