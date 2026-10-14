"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { IconTarget, IconStack2, IconLayoutList, IconSun, IconMoon, IconLayoutRows, IconNotes } from "@tabler/icons-react"
import {
  CommandDialog,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { useProjects, useSprints } from "@/hooks/use-kap"
import { pickCurrentSprint, sortSprints } from "@/lib/session"
import { useProjectStore } from "@/store/projectStore"
import { useUiStore } from "@/store/uiStore"

// Ctrl/⌘ K: jump to a story on screen, a sprint, a page or a project.
export function CommandPalette() {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const { paletteOpen, setPaletteOpen, sprintStories, focusIssue } = useUiStore()
  const { projectId, setProjectId } = useProjectStore()
  const { data: projects } = useProjects()
  const { data: sprintsData } = useSprints(projectId)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setPaletteOpen(!useUiStore.getState().paletteOpen)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [setPaletteOpen])

  const run = (fn: () => void) => {
    setPaletteOpen(false)
    fn()
  }

  const sprints = sortSprints(sprintsData?.versions ?? []).reverse()
  const current = pickCurrentSprint(sprintsData?.versions)

  return (
    <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen} title="Search" description="Jump to a story, sprint or page">
      <Command>
        <CommandInput placeholder="Type a story #id, subject, sprint or page…" />
        <CommandList className="max-h-96">
          <CommandEmpty>No results.</CommandEmpty>

          {sprintStories.length > 0 && (
            <CommandGroup heading="Stories in this sprint">
              {sprintStories.map((s) => (
                <CommandItem key={s.id} value={`#${s.id} ${s.subject} ${s.assignee ?? ""}`} onSelect={() => run(() => focusIssue(s.id))}>
                  <IconNotes />
                  <span className="text-muted-foreground tabular-nums">#{s.id}</span>
                  <span className="truncate">{s.subject}</span>
                  <CommandShortcut className="tracking-normal">{s.status}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandGroup heading="Go to">
            {current && (
              <CommandItem value="current sprint" onSelect={() => run(() => router.push(`/app/sprints/${current.id}`))}>
                <IconTarget /> Current sprint <CommandShortcut className="tracking-normal">{current.name}</CommandShortcut>
              </CommandItem>
            )}
            <CommandItem value="backlog" onSelect={() => run(() => router.push("/app/backlog"))}>
              <IconStack2 /> Backlog
            </CommandItem>
            <CommandItem value="features" onSelect={() => run(() => router.push("/app/features"))}>
              <IconLayoutList /> Features
            </CommandItem>
          </CommandGroup>

          {sprints.length > 0 && (
            <CommandGroup heading="Sprints">
              {sprints.map((s: any) => (
                <CommandItem key={s.id} value={`sprint ${s.name}`} onSelect={() => run(() => router.push(`/app/sprints/${s.id}`))}>
                  <IconTarget />
                  {s.name}
                  <CommandShortcut className="tracking-normal capitalize">{s.status}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {(projects?.length ?? 0) > 1 && (
            <CommandGroup heading="Switch project">
              {projects.map((p: any) => (
                <CommandItem
                  key={p.id}
                  value={`project ${p.name}`}
                  data-checked={p.id === projectId}
                  onSelect={() =>
                    run(() => {
                      setProjectId(p.id)
                      router.push("/app")
                    })
                  }
                >
                  <IconLayoutRows />
                  {p.name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandSeparator />
          <CommandGroup heading="Preferences">
            <CommandItem value="toggle theme dark light" onSelect={() => run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}>
              {resolvedTheme === "dark" ? <IconSun /> : <IconMoon />}
              Switch to {resolvedTheme === "dark" ? "light" : "dark"} theme
              <CommandShortcut>D</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
