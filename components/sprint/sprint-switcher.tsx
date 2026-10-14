"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { IconChevronLeft, IconChevronRight, IconSelector, IconPlus } from "@tabler/icons-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import VersionSprintModal from "@/components/versionSprintModal"
import { sortSprints } from "@/lib/session"
import { suggestNextSprint } from "@/lib/sprint"
import { formatShortDate } from "@/lib/date"
import { cn } from "@/lib/utils"

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))

// Sprint navigation lives in the page header: ◀ name ▶, searchable list, [ and ] keys.
export function SprintSwitcher({
  sprints,
  current,
  projectId,
  isAdmin,
}: {
  sprints: any[]
  current: any
  projectId: number
  isAdmin: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const sorted = useMemo(() => sortSprints(sprints), [sprints])
  const idx = sorted.findIndex((s) => s.id === current?.id)
  const prev = idx > 0 ? sorted[idx - 1] : null
  const next = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null
  const go = (s: any) => s && router.push(`/app/sprints/${s.id}`)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      if (e.key === "[" && prev) go(prev)
      if (e.key === "]" && next) go(next)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const openSprints = [...sorted].filter((s) => s.status === "open")
  const otherSprints = [...sorted].filter((s) => s.status !== "open").reverse()

  const item = (s: any) => (
    <CommandItem
      key={s.id}
      value={`${s.name} ${s.id}`}
      data-checked={s.id === current?.id}
      onSelect={() => {
        setOpen(false)
        go(s)
      }}
    >
      <span className={cn("size-1.5 rounded-full", s.status === "open" ? "bg-emerald-500" : "bg-muted-foreground/40")} />
      <span className="flex-1 truncate">{s.name}</span>
      <span className="text-[10px] text-muted-foreground">{formatShortDate(s.due_date)}</span>
    </CommandItem>
  )

  return (
    <>
      <ButtonGroup>
        <Tooltip>
          <TooltipTrigger render={<Button size="icon" variant="outline" disabled={!prev} onClick={() => go(prev)} aria-label="Previous sprint" />}>
            <IconChevronLeft />
          </TooltipTrigger>
          <TooltipContent>
            {prev?.name ?? "No earlier sprint"} <Kbd>[</Kbd>
          </TooltipContent>
        </Tooltip>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger render={<Button variant="outline" className="min-w-36 justify-between gap-2 px-2.5 font-semibold" />}>
            <span className="truncate">{current?.name ?? "Select sprint"}</span>
            <IconSelector className="opacity-50" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 gap-0 p-0">
            <Command>
              <CommandInput placeholder="Find sprint…" />
              <CommandList>
                <CommandEmpty>No sprint found.</CommandEmpty>
                {openSprints.length > 0 && <CommandGroup heading="Open">{openSprints.map(item)}</CommandGroup>}
                {otherSprints.length > 0 && <CommandGroup heading="Closed">{otherSprints.map(item)}</CommandGroup>}
                {isAdmin && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        value="__create"
                        onSelect={() => {
                          setOpen(false)
                          setCreateOpen(true)
                        }}
                      >
                        <IconPlus /> New sprint
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Tooltip>
          <TooltipTrigger render={<Button size="icon" variant="outline" disabled={!next} onClick={() => go(next)} aria-label="Next sprint" />}>
            <IconChevronRight />
          </TooltipTrigger>
          <TooltipContent>
            {next?.name ?? "No later sprint"} <Kbd>]</Kbd>
          </TooltipContent>
        </Tooltip>
      </ButtonGroup>

      {isAdmin && (
        <VersionSprintModal
          projectId={projectId}
          mode="create"
          open={createOpen}
          onOpenChange={setCreateOpen}
          hideTrigger
          suggestion={suggestNextSprint(sorted[sorted.length - 1])}
        />
      )}
    </>
  )
}
