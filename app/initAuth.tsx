"use client"

import { useEffect } from "react"
import { useAuthStore } from "@/store/authStore"
import { useRouter } from "next/navigation"

export default function InitAuth() {
  const setApiKey = useAuthStore((s) => s.setApiKey)
  const router = useRouter()

  useEffect(() => {
    const key = localStorage.getItem("apiKey")
    if (key){ setApiKey(key);}
    else router.push("/login")
  }, [])

  return null
}