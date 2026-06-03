"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function LoginPage() {
  const [key, setKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("https://kap01.kpit.com/kap")
  const setApiKey = useAuthStore((s) => s.setApiKey)
  const setStoreBaseUrl = useAuthStore((s) => s.setBaseUrl)
  const router = useRouter()

  const handleLogin = () => {
    if (!key || !baseUrl) return
    setApiKey(key)
    setStoreBaseUrl(baseUrl)
    router.push("/app")
  }

  return (
    <div className="flex h-screen items-center justify-center bg-neutral-950 text-white">
      <Card className="w-90 bg-neutral-900 border border-neutral-800 shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl text-neutral-200 font-semibold">Tracker Login</CardTitle>
          <CardDescription className="text-neutral-400">
            Enter your Redmine base URL and API key
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            placeholder="Base URL (e.g. https://redmine.example.com/kap)"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="bg-neutral-800 border-neutral-700 focus-visible:ring-neutral-500"
          />

          <Input
            placeholder="API Key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="bg-neutral-800 border-neutral-700 focus-visible:ring-neutral-500"
          />

          <Button
            className="w-full bg-white text-black hover:bg-neutral-200"
            onClick={handleLogin}
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}