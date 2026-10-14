"use client"

import { useState } from "react"
import useSWR from "swr"
import { IconSelector, IconLayoutList } from "@tabler/icons-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { getFeatures } from "@/lib/api/feature"
import { ApiConfig } from "@/lib/utils"
import { cn } from "@/lib/utils"

export const useFeatures = (projectId?: number | null) =>
  useSWR(projectId ? ["features", projectId] : null, () => getFeatures(projectId as number), ApiConfig)

const CLOSED_FEATURE = new Set([5, 6, 9])
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

// Searchable feature list. Open features first; done/closed ones are listed after.
export function FeatureCommand({
  projectId,
  value,
  onSelect,
}: {
  projectId: number
  value?: number | null
  onSelect: (feature: any) => void
}) {
  const { data, isLoading } = useFeatures(projectId)
  const features: any[] = data?.issues ?? []
  const open = features.filter((f) => !CLOSED_FEATURE.has(f.status?.id))
  const done = features.filter((f) => CLOSED_FEATURE.has(f.status?.id))

  const item = (f: any) => (
    <CommandItem key={f.id} value={`#${f.id} ${f.subject}`} data-checked={f.id === value} onSelect={() => onSelect(f)}>
      <span className="shrink-0 text-muted-foreground tabular-nums">#{f.id}</span>
      <span className="truncate">{f.subject}</span>
    </CommandItem>
  )

  return (
    <Command>
      <CommandInput placeholder="Find feature…" />
      <CommandList>
        <CommandEmpty>{isLoading ? "Loading features…" : "No feature found."}</CommandEmpty>
        {open.length > 0 && <CommandGroup heading="Features">{open.map(item)}</CommandGroup>}
        {done.length > 0 && <CommandGroup heading="Done / closed">{done.map(item)}</CommandGroup>}
      </CommandList>
    </Command>
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
  const [open, setOpen] = useState(false)
  const { data } = useFeatures(projectId)
  const selected = (data?.issues ?? []).find((f: any) => f.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            aria-invalid={invalid || undefined}
            className="h-8 w-full justify-between gap-2 px-2.5 font-normal"
          />
        }
      >
        <span className={cn("flex min-w-0 items-center gap-1.5", !value && "text-muted-foreground")}>
          <IconLayoutList className="shrink-0 opacity-60" />
          <span className="truncate">
            {selected ? selected.subject : value ? `#${value}` : "Choose a feature"}
          </span>
        </span>
        <IconSelector className="shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) min-w-80 gap-0 p-0">
        <FeatureCommand
          projectId={projectId}
          value={value}
          onSelect={(f) => {
            onChange(f.id)
            rememberFeature(f.id)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
