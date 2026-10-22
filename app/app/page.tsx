"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { useSprints } from "@/hooks/use-kap"
import { pickDefaultSprint } from "@/lib/session"
import { useProjectStore } from "@/store/projectStore"

// /app lands on the sprint last opened in the selected project (else its current sprint).
export default function Page() {
  const router = useRouter()
  const projectId = useProjectStore((s) => s.projectId)
  const { data: sprints, isLoading } = useSprints(projectId)
  const current = pickDefaultSprint(projectId, sprints?.versions)

  useEffect(() => {
    if (current) router.replace(`/app/sprints/${current.id}`)
  }, [current, router])

  if (!projectId || isLoading || current) {
    return (
      <div className="w-full space-y-3 p-3 md:p-6 lg:px-8">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>No sprints in this project</EmptyTitle>
        <EmptyDescription>Plan work in the backlog, or switch project from the sidebar.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button render={<Link href="/app/backlog" />}>Open backlog</Button>
      </EmptyContent>
    </Empty>
  )
}
