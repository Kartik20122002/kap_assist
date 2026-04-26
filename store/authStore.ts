import { create } from "zustand"

type AuthState = {
  apiKey: string | null
  setApiKey: (key: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  apiKey: null,
  setApiKey: (key) => {
    localStorage.setItem("apiKey", key)
    set({ apiKey: key })
  },
  logout: () => {
    localStorage.removeItem("apiKey")
    set({ apiKey: null })
  },
}))