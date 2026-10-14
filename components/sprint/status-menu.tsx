"use client"

import { useState } from "react"
import { toast } from "sonner"
import { IconChevronDown, IconArrowRight } from "@tabler/icons-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Spinner } from "@/components/ui/spinner"
import { StatusPill, StatusDot } from "./status-pill"
import { forwardTargets, isSideState, preflight, runStatusJump, STATUS, type JumpContext } from "@/lib/workflow"
import { refreshSprintData } from "@/lib/refresh"
import { cn } from "@/lib/utils"

// Status Jump: pick any status ahead of the current one; the app walks every
// step in between (features.md §0 L1). Closed asks for confirmation first.
export function StatusMenu({
  issue,
  ctx,
  canEdit,
  className,
}: {
  issue: any
  ctx?: JumpContext
  canEdit: boolean
  className?: string
}) {
  const [running, setRunning] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<{ id: number; name: string } | null>(null)

  const statusId = issue?.status?.id
  const statusName = issue?.status?.name
  const targets = forwardTargets(issue)

  const jump = async (target: { id: number; name: string }) => {
    const { problems } = preflight(issue, target.id, ctx)
    if (problems.length) {
      toast.error(`Can't move #${issue.id} to ${target.name}`, { description: problems.join(" · ") })
      return
    }

    setRunning(true)
    const toastId = toast.loading(`#${issue.id} → ${target.name}`)
    try {
      await runStatusJump(issue, target.id, ctx, (step, i, n) =>
        toast.loading(n > 1 ? `#${issue.id} → ${step} (${i}/${n})` : `#${issue.id} → ${step}`, { id: toastId })
      )
      toast.success(`#${issue.id} is now ${target.name}`, { id: toastId })
    } catch (err: any) {
      toast.error(`Stopped at ${err?.reached ?? statusName}`, { id: toastId, description: err?.message })
    } finally {
      await refreshSprintData()
      setRunning(false)
    }
  }

  const select = (target: { id: number; name: string }) => {
    if (target.id === STATUS.CLOSED) setConfirmTarget(target)
    else jump(target)
  }

  if (!canEdit || targets.length === 0) {
    const pill = <StatusPill statusId={statusId} name={statusName} className={className} />
    if (!isSideState(statusId)) return pill
    return (
      <Tooltip>
        <TooltipTrigger render={<span />}>{pill}</TooltipTrigger>
        <TooltipContent>{statusName} isn&apos;t handled here — change it in KAP</TooltipContent>
      </Tooltip>
    )
  }

  const steps = (id: number) => targets.findIndex((t) => t.id === id) + 1

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={running}
          render={
            <button
              type="button"
              className={cn("rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/40", className)}
              aria-label={`Status: ${statusName}. Change status`}
            />
          }
        >
          <StatusPill statusId={statusId} name={statusName} className="hover:brightness-95 dark:hover:brightness-125">
            {running ? <Spinner className="size-3" /> : <IconChevronDown className="size-3 opacity-60" />}
          </StatusPill>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Move forward to</DropdownMenuLabel>
            {targets.map((t) => (
              <DropdownMenuItem key={t.id} onClick={() => select(t)} className="gap-2">
                <StatusDot statusId={t.id} />
                <span className="flex-1">{t.name}</span>
                {steps(t.id) > 1 && (
                  <span className="text-[10px] text-muted-foreground tabular-nums">{steps(t.id)} steps</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close #{issue.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="line-clamp-2 font-medium text-foreground">{issue.subject}</span>
              <span className="mt-2 flex flex-wrap items-center gap-1">
                {[statusName, ...targets.slice(0, steps(STATUS.CLOSED)).map((t) => t.name)].map((n, i, arr) => (
                  <span key={n + i} className="inline-flex items-center gap-1">
                    {n}
                    {i < arr.length - 1 && <IconArrowRight className="size-3 opacity-50" />}
                  </span>
                ))}
              </span>
              {issue?.tracker?.id !== 6 && <span className="mt-2 block">You can reopen it later if needed.</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const t = confirmTarget
                setConfirmTarget(null)
                if (t) jump(t)
              }}
            >
              Close it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
