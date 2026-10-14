"use client"

import { useEffect, useRef } from "react"
import { IconSearch, IconX } from "@tabler/icons-react"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export const SORTS = [
  { value: "id:desc", label: "Newest first" },
  { value: "id", label: "Oldest first" },
  { value: "updated_on:desc", label: "Recently updated" },
  { value: "subject", label: "Subject A–Z" },
]

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))

// Search (server-side, "/" to focus) + Everyone/Me + sort, shared by list pages.
export function ListToolbar({
  query,
  onQuery,
  mine,
  onMine,
  sort,
  onSort,
  placeholder,
  children,
}: {
  query: string
  onQuery: (q: string) => void
  mine: boolean
  onMine: (mine: boolean) => void
  sort: string
  onSort: (sort: string) => void
  placeholder: string
  children?: React.ReactNode
}) {
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !isTyping(e.target) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      {children}
      <ToggleGroup
        value={[mine ? "me" : "all"]}
        onValueChange={(v: string[]) => v[0] && onMine(v[0] === "me")}
        variant="outline"
        size="sm"
        spacing={0}
      >
        <ToggleGroupItem value="all">Everyone</ToggleGroupItem>
        <ToggleGroupItem value="me">Me</ToggleGroupItem>
      </ToggleGroup>

      <InputGroup className="h-8 flex-1">
        <InputGroupAddon>
          <IconSearch />
        </InputGroupAddon>
        <InputGroupInput
          ref={searchRef}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && (onQuery(""), e.currentTarget.blur())}
          placeholder={placeholder}
        />
        <InputGroupAddon align="inline-end">
          {query ? (
            <InputGroupButton size="icon-xs" onClick={() => onQuery("")} aria-label="Clear search">
              <IconX />
            </InputGroupButton>
          ) : (
            <Kbd>/</Kbd>
          )}
        </InputGroupAddon>
      </InputGroup>

      <Select value={sort} onValueChange={(v) => v && onSort(String(v))}>
        <SelectTrigger className="h-8 w-full text-xs lg:w-44">
          <SelectValue>{SORTS.find((s) => s.value === sort)?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SORTS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
