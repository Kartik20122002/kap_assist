import { cn } from "@/lib/utils"
import { statusTone, type StatusTone } from "@/lib/workflow"

const TONE_CLASSES: Record<StatusTone, string> = {
  todo: "bg-muted text-muted-foreground",
  active: "bg-blue-500/12 text-blue-700 dark:text-blue-300",
  done: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  closed: "bg-muted/60 text-muted-foreground/80",
  blocked: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
}

const DOT_CLASSES: Record<StatusTone, string> = {
  todo: "bg-muted-foreground/50",
  active: "bg-blue-500",
  done: "bg-emerald-500",
  closed: "bg-muted-foreground/40",
  blocked: "bg-amber-500",
}

export function StatusDot({ statusId, className }: { statusId?: number; className?: string }) {
  return <span className={cn("size-1.5 shrink-0 rounded-full", DOT_CLASSES[statusTone(statusId)], className)} />
}

export function StatusPill({
  statusId,
  name,
  className,
  children,
}: {
  statusId?: number
  name?: string
  className?: string
  children?: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-[11px] font-medium whitespace-nowrap",
        TONE_CLASSES[statusTone(statusId)],
        className
      )}
    >
      <StatusDot statusId={statusId} />
      {name}
      {children}
    </span>
  )
}
