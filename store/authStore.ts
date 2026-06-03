import { create } from "zustand"

type AuthState = {
  apiKey: string | null
  baseUrl: string | null
  setApiKey: (key: string) => void
  setBaseUrl: (url: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  apiKey: null,
  baseUrl: null,
  setApiKey: (key) => {
    localStorage.setItem("apiKey", key)
    set({ apiKey: key })
  },
  setBaseUrl: (url) => {
    localStorage.setItem("baseUrl", url)
    set({ baseUrl: url })
  },
  logout: () => {
    localStorage.removeItem("apiKey")
    localStorage.removeItem("baseUrl")
    set({ apiKey: null, baseUrl: null })
  },
}))