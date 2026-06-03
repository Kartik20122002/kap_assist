"use client"

import { useEffect } from "react"
import { useAuthStore } from "@/store/authStore"
import { useRouter } from "next/navigation"

export default function InitAuth() {
  const setApiKey = useAuthStore((s) => s.setApiKey)
  const setBaseUrl = useAuthStore((s) => s.setBaseUrl)
  const router = useRouter()

  useEffect(() => {
    const key = localStorage.getItem("apiKey")
    const url = localStorage.getItem("baseUrl")
    if (key) {
      setApiKey(key)
      if (url) setBaseUrl(url)
    } else router.push("/login")
  }, [])

  return null
}