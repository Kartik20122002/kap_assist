/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getFeatures } from "@/lib/api/feature"
import { getProjects } from "@/lib/api/project"
import { getCurrentUser } from "@/lib/api/user"
import { ApiConfig, statusStyles } from "@/lib/utils"
import CreateFeatureModal from "@/components/createFeatureModal"
import EditFeatureModal from "@/components/editFeatureModal"

const PAGE_SIZE = 15

export default function FeaturesPage() {
  const [projectId, setProjectId] = useState<number>(0)
  const [page, setPage] = useState(0)

  useEffect(() => {
    const stored = localStorage.getItem("selectedProject")
    if (stored) setProjectId(Number(stored))
  }, [])

  useEffect(() => { setPage(0) }, [projectId])

  const { data: user } = useSWR(["user"], getCurrentUser, ApiConfig)
  const { data: projects } = useSWR(["projects"], getProjects, ApiConfig)
  const project = projects?.find((p: any) => p.id === projectId)

  const roles = user?.memberships
    ?.map((mm: any) => mm.project?.id === projectId ? mm.roles ?? [] : [])
    .flat()
    .sort((a: any, b: any) => a.id - b.id)
  const isAdmin = roles?.some((role: any) => role.id === 6)

  const { data, isLoading } = useSWR(
    projectId ? ["features", projectId] : null,
    () => getFeatures(projectId),
    ApiConfig
  )

  const allFeatures = data?.issues ?? []
  const totalCount = data?.total_count ?? allFeatures.length

  const offset = page * PAGE_SIZE
  const features = allFeatures.slice(offset, offset + PAGE_SIZE)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  if (!projectId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No project selected. Please select a project from the sidebar.
      </div>
    )
  }

  const Pagination = () => (
    <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPage(p => p - 1)} disabled={page === 0}>Prev</Button>
      <span>Page {page + 1} of {totalPages} · {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount}</span>
      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Next</Button>
    </div>
  )

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">

      {/* HEADER */}
      <Card className="bg-muted/40">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div>
              <CardTitle className="text-lg">Features</CardTitle>
              {project && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {project.name} · {totalCount} feature{totalCount !== 1 ? "s" : ""}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {totalPages > 1 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPage(p => p - 1)} disabled={page === 0}>Prev</Button>
                  <span className="px-1">{page + 1} / {totalPages}</span>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Next</Button>
                </div>
              )}
              {isAdmin && projectId > 0 && (
                <CreateFeatureModal projectId={projectId} />
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* FEATURES LIST */}
      <Card className="bg-muted/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            Features
            {totalCount > 0 && <Badge variant="outline" className="text-[10px]">{totalCount}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
          {!isLoading && features.length === 0 && (
            <div className="text-xs text-muted-foreground">No features found for this project.</div>
          )}
          {features.map((feature: any) => (
            <FeatureCard key={feature.id} feature={feature} isAdmin={isAdmin} />
          ))}
          {totalPages > 1 && features.length > 0 && <Pagination />}
        </CardContent>
      </Card>
    </div>
  )
}

function FeatureCard({ feature, isAdmin }: { feature: any; isAdmin: boolean }) {
  const tShirtSize = feature.custom_fields?.find((f: any) => f.id === 4)?.value
  const sizeUom = feature.custom_fields?.find((f: any) => f.id === 6)?.value

  return (
    <Card className="bg-muted/40 transition">
      <CardContent className="p-3 space-y-2">

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
          <div className="min-w-0">
            <span className="text-[10px] text-muted-foreground">#{feature.id}</span>
            <div className="text-base font-medium line-clamp-2 sm:line-clamp-1">
              {feature.subject}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <span className={`px-2 rounded-full text-xs ${statusStyles[feature?.status?.name] ?? "bg-muted text-muted-foreground"}`}>
              {feature.status?.name}
            </span>
            <Badge variant="outline" className="text-[10px]">{feature.priority?.name}</Badge>
            {isAdmin && <EditFeatureModal feature={feature} iconOnly />}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 text-xs">
          <div>
            <span className="opacity-60">Assigned</span>
            <div>{feature.assigned_to?.name || "-"}</div>
          </div>
          <div>
            <span className="opacity-60">Author</span>
            <div>{feature.author?.name || "-"}</div>
          </div>
          <div>
            <span className="opacity-60">Start</span>
            <div>{feature.start_date || "-"}</div>
          </div>
          <div>
            <span className="opacity-60">Due</span>
            <div>{feature.due_date || "-"}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs">
          {tShirtSize && (
            <div className="flex items-center gap-1">
              <span className="opacity-60">Size:</span>
              <Badge variant="secondary" className="text-[10px] px-1.5">{tShirtSize}</Badge>
            </div>
          )}
          {sizeUom && (
            <div className="flex items-center gap-1">
              <span className="opacity-60">UOM:</span>
              <span>{sizeUom}</span>
            </div>
          )}
          {feature.parent && (
            <div className="flex items-center gap-1">
              <span className="opacity-60">Epic:</span>
              <span>#{feature.parent.id}</span>
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  )
}
