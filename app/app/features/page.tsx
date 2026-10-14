"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import CreateFeatureModal from "@/components/createFeatureModal"
import { FeatureRow } from "@/components/features/feature-row"
import { useEpics } from "@/components/forms/feature-picker"
import { ListToolbar } from "@/components/list/list-toolbar"
import { Pager } from "@/components/list/pager"
import { listIssues } from "@/lib/api/issues"
import { ApiConfig } from "@/lib/utils"
import { useProjects, useUser } from "@/hooks/use-kap"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { isProjectAdmin } from "@/lib/session"
import { useProjectStore } from "@/store/projectStore"

type StatusTab = "open" | "closed" | "all"

export default function FeaturesPage() {
  const projectId = useProjectStore((s) => s.projectId) ?? 0
  const { data: user } = useUser()
  const { data: projects } = useProjects()
  const project = projects?.find((p: any) => p.id === projectId)
  const isAdmin = isProjectAdmin(user, projectId)

  const [status, setStatus] = useState<StatusTab>("open")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [query, setQuery] = useState("")
  const [mine, setMine] = useState(false)
  const [sort, setSort] = useState("id:desc")
  const q = useDebouncedValue(query)

  const { data, isLoading, isValidating } = useSWR(
    projectId ? ["featurePage", projectId, status, page, pageSize, q, mine, sort] : null,
    () =>
      listIssues({
        projectId,
        trackerId: 2,
        status,
        assignedTo: mine ? "me" : undefined,
        q,
        sort,
        offset: (page - 1) * pageSize,
        limit: pageSize,
      }),
    { ...ApiConfig, keepPreviousData: true }
  )
  const features = data?.issues ?? []
  const total = data?.total_count ?? 0

  const { data: epics } = useEpics(projectId)
  const epicNames = useMemo(() => Object.fromEntries((epics ?? []).map((e: any) => [e.id, e.subject])), [epics])

  const resetPage = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setPage(1)
  }

  if (!projectId) {
    return <div className="p-6 text-sm text-muted-foreground">Select a project from the sidebar.</div>
  }

  return (
    <div className="w-full space-y-3 p-3 md:space-y-4 md:p-6 lg:px-8">
      <header className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            Features
            {data && <Badge variant="secondary" className="tabular-nums">{total}</Badge>}
          </h1>
          <p className="text-xs text-muted-foreground">{project?.name} · open a feature to see its stories</p>
        </div>
        {isAdmin && <CreateFeatureModal projectId={projectId} />}
      </header>

      <ListToolbar
        query={query}
        onQuery={resetPage(setQuery)}
        mine={mine}
        onMine={resetPage(setMine)}
        sort={sort}
        onSort={resetPage(setSort)}
        placeholder="Search by subject or #id"
      >
        <Tabs value={status} onValueChange={(v) => resetPage(setStatus)(v as StatusTab)}>
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </ListToolbar>

      <div className={`space-y-2 transition-opacity ${isValidating && data ? "opacity-60" : ""}`}>
        {isLoading && !data ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
        ) : features.length === 0 ? (
          <Empty className="rounded-xl border border-dashed">
            <EmptyHeader>
              <EmptyTitle>No features here</EmptyTitle>
              <EmptyDescription>{q || mine ? "Try another search or Everyone." : "Try another status tab."}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          features.map((f) => <FeatureRow key={f.id} feature={f} epicName={epicNames[f.parent?.id]} isAdmin={isAdmin} />)
        )}
      </div>

      {total > 0 && (
        <Pager
          page={page}
          pageSize={pageSize}
          total={total}
          loading={isValidating}
          onPage={(p) => {
            setPage(p)
            window.scrollTo({ top: 0, behavior: "smooth" })
          }}
          onPageSize={resetPage(setPageSize)}
        />
      )}
    </div>
  )
}
