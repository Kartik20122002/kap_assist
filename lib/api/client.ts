import axios from "axios"
import { useAuthStore } from "@/store/authStore"

export const api = axios.create({
  baseURL: "/api/redmine",
})

api.interceptors.request.use((config) => {
  const key = localStorage.getItem("apiKey")
  if (key) {
    config.headers["x-api-key"] = key
  }
  return config
})