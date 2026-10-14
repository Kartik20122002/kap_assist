"use client"

import { useState } from "react"
import useSWR from "swr"
import { IconSelector, IconLayoutList, IconStack3 } from "@tabler/icons-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { getFeatures } from "@/lib/api/feature"
import { getEpics } from "@/lib/api/epic"
import { ApiConfig } from "@/lib/utils"
import { cn } from "@/lib/utils"

export const useFeatures = (projectId?: number | null) =>
  useSWR(projectId ? ["features", projectId] : null, () => getFeatures(projectId as number), ApiConfig)

export const useEpics = (projectId?: number | null) =>
  useSWR(projectId ? ["epics", projectId] : null, () => getEpics(projectId as number), ApiConfig)

const DONE_STATUS = new Set([5, 6, 9])
const LAST_FEATURE_KEY = "lastFeatureId"

export const rememberFeature = (id: number) => {
  try {
    localStorage.setItem(LAST_FEATURE_KEY, String(id))
  } catch {}
}

export const lastFeatureId = () => {
  try {
    return Number(localStorage.getItem(LAST_FEATURE_KEY)) || null
  } catch {
    return null
  }
}

// Searchable issue list: open items first, done/closed after.
export function IssueCommand({
  items,
  loading,
  value,
  onSelect,
  noun,
}: {
  items: any[]
  loading?: boolean
  value?: number | null
  onSelect: (issue: any) => void
  noun: string
}) {
  const open = items.filter((f) => !DONE_STATUS.has(f.status?.id))
  const done = items.filter((f) => DONE_STATUS.has(f.status?.id))

  const item = (f: any) => (
    <CommandItem key={f.id} value={`#${f.id} ${f.subject}`} data-checked={f.id === value} onSelect={() => onSelect(f)}>
      <span className="shrink-0 text-muted-foreground tabular-nums">#{f.id}</span>
      <span className="truncate">{f.subject}</span>
    </CommandItem>
  )

  return (
    <Command>
      <CommandInput placeholder={`Find ${noun}…`} />
      <CommandList>
        <CommandEmpty>{loading ? `Loading ${noun}s…` : `No ${noun} found.`}</CommandEmpty>
        {open.length > 0 && <CommandGroup heading={`Open ${noun}s`}>{open.map(item)}</CommandGroup>}
        {done.length > 0 && <CommandGroup heading="Done / closed">{done.map(item)}</CommandGroup>}
      </CommandList>
    </Command>
  )
}

export function FeatureCommand({ projectId, value, onSelect }: { projectId: number; value?: number | null; onSelect: (f: any) => void }) {
  const { data, isLoading } = useFeatures(projectId)
  return <IssueCommand items={data?.issues ?? []} loading={isLoading} value={value} onSelect={onSelect} noun="feature" />
}

function IssuePicker({
  items,
  loading,
  value,
  onChange,
  invalid,
  noun,
  icon: Icon,
}: {
  items: any[]
  loading?: boolean
  value: number | null
  onChange: (issue: any) => void
  invalid?: boolean
  noun: string
  icon: typeof IconLayoutList
}) {
  const [open, setOpen] = useState(false)
  const selected = items.find((f: any) => f.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="outline" aria-invalid={invalid || undefined} className="h-8 w-full justify-between gap-2 px-2.5 font-normal" />}
      >
        <span className={cn("flex min-w-0 items-center gap-1.5", !value && "text-muted-foreground")}>
          <Icon className="shrink-0 opacity-60" />
          <span className="truncate">{selected ? selected.subject : value ? `#${value}` : `Choose a ${noun}`}</span>
        </span>
        <IconSelector className="shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) min-w-80 gap-0 p-0">
        <IssueCommand
          items={items}
          loading={loading}
          value={value}
          noun={noun}
          onSelect={(f) => {
            onChange(f)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export function FeaturePicker({
  projectId,
  value,
  onChange,
  invalid,
}: {
  projectId: number
  value: number | null
  onChange: (id: number) => void
  invalid?: boolean
}) {
  const { data, isLoading } = useFeatures(projectId)
  return (
    <IssuePicker
      items={data?.issues ?? []}
      loading={isLoading}
      value={value}
      invalid={invalid}
      noun="feature"
      icon={IconLayoutList}
      onChange={(f) => {
        onChange(f.id)
        rememberFeature(f.id)
      }}
    />
  )
}

export function EpicPicker({
  projectId,
  value,
  onChange,
  invalid,
}: {
  projectId: number
  value: number | null
  onChange: (id: number) => void
  invalid?: boolean
}) {
  const { data, isLoading } = useEpics(projectId)
  return (
    <IssuePicker
      items={data ?? []}
      loading={isLoading}
      value={value}
      invalid={invalid}
      noun="epic"
      icon={IconStack3}
      onChange={(e) => onChange(e.id)}
    />
  )
}
