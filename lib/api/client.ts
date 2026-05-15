import axios from "axios"

export const api = axios.create({
  baseURL: "/redmine",
})

api.interceptors.request.use((config) => {
  const key = localStorage.getItem("apiKey")
  if (key) {
    config.headers["x-api-key"] = key
  }
  return config
})