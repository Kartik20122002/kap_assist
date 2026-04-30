"use client"
import { useRouter } from "next/navigation"
import { useEffect } from "react";

export default function Page() {
  const router = useRouter()
  useEffect(() => {
    const key = localStorage.getItem("apiKey")
    router.replace(key ? "/app" : "/login")
  }, [])
  return null;
}