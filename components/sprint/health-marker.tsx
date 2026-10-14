import { IconAlertTriangle } from "@tabler/icons-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { HealthItem } from "@/lib/health"
import { cn } from "@/lib/utils"

export function HealthMarker({ items }: { items: HealthItem[] }) {
  if (!items.length) return null
  const isError = items.some((i) => i.level === "error")
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn("inline-flex shrink-0", isError ? "text-destructive" : "text-amber-500")}
            aria-label={items.map((i) => i.text).join(", ")}
          />
        }
      >
        <IconAlertTriangle className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent className="flex-col items-start gap-0.5">
        {items.map((i) => (
          <span key={i.text}>{i.text}</span>
        ))}
      </TooltipContent>
    </Tooltip>
  )
}
