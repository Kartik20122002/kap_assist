import { create } from "zustand"

type ProjectState = {
  projectId: number | null
  hydrated: boolean
  hydrate: () => void
  setProjectId: (id: number) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectId: null,
  hydrated: false,
  hydrate: () => {
    const stored = Number(localStorage.getItem("selectedProject"))
    set({ projectId: stored || null, hydrated: true })
  },
  setProjectId: (id) => {
    localStorage.setItem("selectedProject", String(id))
    set({ projectId: id })
  },
}))
