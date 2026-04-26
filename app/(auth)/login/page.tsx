"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function LoginPage() {
  const [key, setKey] = useState("")
  const setApiKey = useAuthStore((s) => s.setApiKey)
  const router = useRouter()

  const handleLogin = () => {
    if (!key) return
    setApiKey(key)
    router.push("/app")
  }

  return (
    <div className="flex h-screen items-center justify-center bg-neutral-950 text-white">
      <Card className="w-90 bg-neutral-900 border border-neutral-800 shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl text-neutral-200 font-semibold">Tracker Login</CardTitle>
          <CardDescription className="text-neutral-400">
            Enter API key
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
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