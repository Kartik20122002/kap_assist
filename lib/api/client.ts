import axios from "axios"

export const api = axios.create({
  baseURL: "/redmine",
})

api.interceptors.request.use((config) => {
  const key = localStorage.getItem("apiKey")
  const baseUrl = localStorage.getItem("baseUrl")
  if (key) {
    config.headers["x-api-key"] = key
  }
  if (baseUrl) {
    config.headers["x-base-url"] = baseUrl
  }
  return config
})