import { api } from "./client"

export const getCurrentUser = async () => {
  const res = await api.get("/users")
  return res.data.user
}