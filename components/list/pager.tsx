"use client"

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export const PAGE_SIZES = [25, 50, 100] // Redmine allows at most 100 per request

// Page numbers with ellipses: 1 … 4 5 6 … 12
const pageList = (current: number, total: number) => {
  const pages = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total))
  const sorted = [...pages].sort((a, b) => a - b)
  const out: (number | "…")[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…")
    out.push(p)
  })
  return out
}

// Server-side pagination driven by Redmine's total_count / offset / limit.
export function Pager({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
  loading,
}: {
  page: number // 1-based
  pageSize: number
  total: number
  onPage: (page: number) => void
  onPageSize: (size: number) => void
  loading?: boolean
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {from}–{to} of {total}
        </span>
        <span className="opacity-40">·</span>
        <Select value={String(pageSize)} onValueChange={(v) => v && onPageSize(Number(v))}>
          <SelectTrigger size="sm" className="h-7 w-auto gap-1 text-xs">
            <SelectValue>{pageSize} / page</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {pages > 1 && (
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" disabled={page <= 1 || loading} onClick={() => onPage(page - 1)} aria-label="Previous page">
            <IconChevronLeft />
          </Button>
          {pageList(page, pages).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="px-1 text-xs text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={p}
                size="icon"
                variant={p === page ? "default" : "ghost"}
                disabled={loading}
                onClick={() => onPage(p)}
                className="tabular-nums"
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </Button>
            )
          )}
          <Button size="icon" variant="outline" disabled={page >= pages || loading} onClick={() => onPage(page + 1)} aria-label="Next page">
            <IconChevronRight />
          </Button>
        </div>
      )}
    </div>
  )
}
