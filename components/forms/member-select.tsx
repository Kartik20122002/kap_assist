"use client"

import useSWR from "swr"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getProjectMembers } from "@/lib/api/project"
import { ApiConfig } from "@/lib/utils"

export const useMembers = (projectId?: number | null) =>
  useSWR(projectId ? ["project-members", projectId] : null, () => getProjectMembers(projectId as number), ApiConfig)

export function MemberSelect({
  projectId,
  value,
  onChange,
  fallbackName,
  placeholder = "Select member",
  invalid,
}: {
  projectId: number
  value: string
  onChange: (id: string) => void
  fallbackName?: string
  placeholder?: string
  invalid?: boolean
}) {
  const { data: members } = useMembers(projectId)
  const name = members?.find((m: any) => String(m.id) === value)?.name ?? (value ? fallbackName : undefined)

  return (
    <Select value={value} onValueChange={(v) => v != null && onChange(String(v))}>
      <SelectTrigger className="h-8 w-full text-xs" aria-invalid={invalid || undefined}>
        <SelectValue>{name ?? <span className="text-muted-foreground">{placeholder}</span>}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(members ?? []).map((m: any) => (
          <SelectItem key={m.id} value={String(m.id)}>
            {m.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
