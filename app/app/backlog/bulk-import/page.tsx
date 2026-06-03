/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useRef, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createStory } from "@/lib/api/story"
import { getProjectMembers } from "@/lib/api/project"
import { mutate } from "swr"

const VALID_POINTS = new Set([1, 2, 3, 5, 8, 13])
const MAX_STORIES = 100

// ── CSV parser ──────────────────────────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length < 2) return []

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"))

    return lines.slice(1).map((line) => {
        // basic CSV split respecting quoted fields
        const values: string[] = []
        let cur = ""
        let inQuote = false
        for (const ch of line) {
            if (ch === '"') { inQuote = !inQuote }
            else if (ch === "," && !inQuote) { values.push(cur.trim()); cur = "" }
            else { cur += ch }
        }
        values.push(cur.trim())

        const row: Record<string, string> = {}
        headers.forEach((h, i) => { row[h] = (values[i] ?? "").replace(/^"|"$/g, "") })
        return row
    })
}

// ── Types ────────────────────────────────────────────────────────────────────

type RowStatus = "ok" | "error" | "warn"

interface DraftRow {
    subject: string
    description: string
    story_points: string
    acceptance_criteria: string
    assigned_to_raw: string
    assigned_to_id: number | null
    assigned_to_matched: boolean
    rowStatus: RowStatus
    errors: string[]
    warnings: string[]
}

interface ResultRow {
    subject: string
    status: "success" | "failed"
    error?: string
}

type Step = "upload" | "draft" | "progress" | "summary"

// ── Info Modal ────────────────────────────────────────────────────────────────

function FormatGuide({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background border border-border rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">How to prepare your CSV file</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
                </div>

                <div className="space-y-3 text-xs text-muted-foreground">
                    <p>Create a <strong className="text-foreground">.csv</strong> file with the following columns in the first row (header row):</p>

                    <div className="bg-muted/50 rounded p-3 font-mono text-[11px] overflow-x-auto whitespace-pre">
{`subject,description,story_points,acceptance_criteria,assigned_to`}
                    </div>

                    <table className="w-full text-[11px] border-collapse">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left py-1 pr-3 text-foreground font-medium">Column</th>
                                <th className="text-left py-1 pr-3 text-foreground font-medium">Required</th>
                                <th className="text-left py-1 text-foreground font-medium">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            <tr><td className="py-1.5 pr-3 font-mono">subject</td><td className="py-1.5 pr-3 text-red-500">Yes</td><td className="py-1.5">The story title. Cannot be empty.</td></tr>
                            <tr><td className="py-1.5 pr-3 font-mono">description</td><td className="py-1.5 pr-3">No</td><td className="py-1.5">Free text description.</td></tr>
                            <tr><td className="py-1.5 pr-3 font-mono">story_points</td><td className="py-1.5 pr-3">No</td><td className="py-1.5">Must be one of: 1, 2, 3, 5, 8, 13. Leave blank to skip.</td></tr>
                            <tr><td className="py-1.5 pr-3 font-mono">acceptance_criteria</td><td className="py-1.5 pr-3">No</td><td className="py-1.5">Free text. Wrap in quotes if it contains commas.</td></tr>
                            <tr><td className="py-1.5 pr-3 font-mono">assigned_to</td><td className="py-1.5 pr-3">No</td><td className="py-1.5">Project member username. Case-insensitive match. If not found, story is created unassigned.</td></tr>
                        </tbody>
                    </table>

                    <p className="font-medium text-foreground">Example file:</p>
                    <div className="bg-muted/50 rounded p-3 font-mono text-[11px] overflow-x-auto whitespace-pre">
{`subject,description,story_points,acceptance_criteria,assigned_to
User can reset password,Send reset email,3,"Given email exists, reset email is sent",kartikh1
User can view profile,,2,,
Dark mode toggle,,1,Toggle persists across sessions,JohnDoe`}
                    </div>

                    <ul className="list-disc pl-4 space-y-1">
                        <li>Maximum <strong className="text-foreground">100 stories</strong> per file — only the first 100 rows are imported.</li>
                        <li>Rows with an empty subject or invalid story_points will block the import until removed.</li>
                        <li>You can create this file in Excel or Google Sheets: File → Download → CSV.</li>
                    </ul>
                </div>

                <div className="flex justify-end pt-2">
                    <Button size="sm" onClick={onClose} className="h-7 px-4 text-xs">Got it</Button>
                </div>
            </div>
        </div>
    )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function BulkImportInner() {
    const searchParams = useSearchParams()
    const projectId = Number(searchParams.get("projectId") ?? 0)

    const [step, setStep] = useState<Step>("upload")
    const [showGuide, setShowGuide] = useState(false)
    const [trimmedCount, setTrimmedCount] = useState(0)
    const [rows, setRows] = useState<DraftRow[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [results, setResults] = useState<ResultRow[]>([])
    const [progressIndex, setProgressIndex] = useState(0)
    const fileRef = useRef<HTMLInputElement>(null)

    // build lowercase name→id map
    const memberMap = useCallback((memberList: any[]) => {
        const map = new Map<string, number>()
        memberList.forEach((m: any) => map.set(String(m.name).toLowerCase(), m.id))
        return map
    }, [])

    const handleFile = async (file: File) => {
        if (!file.name.endsWith(".csv")) {
            alert("Please upload a .csv file.")
            return
        }

        let memberList: any[] = []
        try {
            memberList = await getProjectMembers(projectId)
            setMembers(memberList)
        } catch {
            // proceed without member matching
        }

        const map = memberMap(memberList)
        const text = await file.text()
        const parsed = parseCSV(text)

        let trimmed = 0
        let limited = parsed
        if (parsed.length > MAX_STORIES) {
            trimmed = parsed.length - MAX_STORIES
            limited = parsed.slice(0, MAX_STORIES)
        }
        setTrimmedCount(trimmed)

        const draft: DraftRow[] = limited.map((raw) => {
            const subject = (raw["subject"] ?? "").trim()
            const description = (raw["description"] ?? "").trim()
            const story_points = (raw["story_points"] ?? "").trim()
            const acceptance_criteria = (raw["acceptance_criteria"] ?? "").trim()
            const assigned_to_raw = (raw["assigned_to"] ?? "").trim()

            const errors: string[] = []
            const warnings: string[] = []

            if (!subject) errors.push("Subject is required")

            if (story_points !== "" && !VALID_POINTS.has(Number(story_points))) {
                errors.push(`Invalid story points "${story_points}" — must be 1, 2, 3, 5, 8, or 13`)
            }

            let assigned_to_id: number | null = null
            let assigned_to_matched = false
            if (assigned_to_raw) {
                const matchedId = map.get(assigned_to_raw.toLowerCase())
                if (matchedId !== undefined) {
                    assigned_to_id = matchedId
                    assigned_to_matched = true
                } else {
                    warnings.push(`"${assigned_to_raw}" not found in project members — will be created unassigned`)
                }
            }

            const rowStatus: RowStatus = errors.length > 0 ? "error" : warnings.length > 0 ? "warn" : "ok"

            return { subject, description, story_points, acceptance_criteria, assigned_to_raw, assigned_to_id, assigned_to_matched, rowStatus, errors, warnings }
        })

        setRows(draft)
        setStep("draft")
    }

    const removeRow = (index: number) => {
        setRows((prev) => prev.filter((_, i) => i !== index))
    }

    const hasBlockingErrors = rows.some((r) => r.rowStatus === "error")

    const handleImport = async () => {
        setResults([])
        setProgressIndex(0)
        setStep("progress")

        const resultList: ResultRow[] = []

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            setProgressIndex(i + 1)

            const customFields: any[] = []
            if (row.acceptance_criteria) customFields.push({ id: 72, value: row.acceptance_criteria })
            if (row.story_points) customFields.push({ id: 8, value: row.story_points })

            const payload: any = {
                project_id: projectId,
                tracker_id: 5,
                status_id: 1,
                priority_id: 2,
                subject: row.subject,
            }
            if (row.description) payload.description = row.description
            if (row.story_points) {
                payload.rb_story_points = Number(row.story_points)
                payload.estimated_hours = 4.5 * Number(row.story_points)
                payload.remaining_hours = 4.5 * Number(row.story_points)
            }
            if (customFields.length) payload.custom_fields = customFields
            if (row.assigned_to_id) payload.assigned_to_id = row.assigned_to_id

            try {
                const ok = await createStory(payload)
                resultList.push({ subject: row.subject, status: ok ? "success" : "failed", error: ok ? undefined : "API returned failure" })
            } catch (err: any) {
                resultList.push({ subject: row.subject, status: "failed", error: err?.message ?? "Unknown error" })
            }
        }

        mutate((key: any) => Array.isArray(key) && key[0] === "backlogStories")
        setResults(resultList)
        setStep("summary")
    }

    const reset = () => {
        setStep("upload")
        setRows([])
        setResults([])
        setTrimmedCount(0)
        setProgressIndex(0)
        if (fileRef.current) fileRef.current.value = ""
    }

    // ── Upload Step ────────────────────────────────────────────────────────────
    if (step === "upload") return (
        <div className="p-3 md:p-6 max-w-2xl space-y-4">
            {showGuide && <FormatGuide onClose={() => setShowGuide(false)} />}

            <div className="flex items-center gap-3">
                <a href="/app/backlog" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Backlog</a>
                <span className="text-xs text-muted-foreground">/</span>
                <span className="text-xs font-medium">Bulk Import Stories</span>
            </div>

            <Card className="bg-muted/40">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Add Bulk Stories</CardTitle>
                        <button
                            onClick={() => setShowGuide(true)}
                            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                        >
                            How to prepare the file?
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Upload a CSV file to import multiple user stories at once. Maximum <strong>100 stories</strong> per file.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center gap-3 text-center">
                        <div className="text-3xl opacity-40">📄</div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Upload your CSV file</p>
                            <p className="text-xs text-muted-foreground">Columns: subject, description, story_points, acceptance_criteria, assigned_to</p>
                        </div>
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                        />
                        <Button size="sm" onClick={() => fileRef.current?.click()} className="h-7 px-4 text-xs mt-1">
                            Choose CSV File
                        </Button>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-xs text-amber-800 dark:text-amber-300">
                        Only the first <strong>100 rows</strong> will be imported if your file contains more.
                    </div>
                </CardContent>
            </Card>
        </div>
    )

    // ── Draft Step ─────────────────────────────────────────────────────────────
    if (step === "draft") {
        const errorCount = rows.filter((r) => r.rowStatus === "error").length
        const warnCount = rows.filter((r) => r.rowStatus === "warn").length

        return (
            <div className="p-3 md:p-6 space-y-4">
                {showGuide && <FormatGuide onClose={() => setShowGuide(false)} />}

                <div className="flex items-center gap-3">
                    <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Re-upload</button>
                    <span className="text-xs text-muted-foreground">/</span>
                    <span className="text-xs font-medium">Review Stories</span>
                </div>

                <Card className="bg-muted/40">
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                                <CardTitle className="text-base">Review {rows.length} Stories</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">Check stories before importing. Remove rows with errors or re-upload a fixed file.</p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                {errorCount > 0 && <Badge variant="destructive" className="text-[10px]">{errorCount} error{errorCount > 1 ? "s" : ""}</Badge>}
                                {warnCount > 0 && <Badge className="text-[10px] bg-amber-500 hover:bg-amber-500">{warnCount} warning{warnCount > 1 ? "s" : ""}</Badge>}
                                {!hasBlockingErrors && errorCount === 0 && <Badge variant="outline" className="text-[10px] text-green-600 border-green-500">{rows.length} ready</Badge>}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {trimmedCount > 0 && (
                            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-xs text-amber-800 dark:text-amber-300">
                                Your file had {rows.length + trimmedCount} stories — only the first {rows.length} were loaded ({trimmedCount} trimmed).
                            </div>
                        )}

                        {hasBlockingErrors && (
                            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md p-3 text-xs text-red-800 dark:text-red-300">
                                Fix or remove all rows with errors before importing.
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left py-2 pr-3 font-medium opacity-60 w-6">#</th>
                                        <th className="text-left py-2 pr-3 font-medium opacity-60">Subject</th>
                                        <th className="text-left py-2 pr-3 font-medium opacity-60">Points</th>
                                        <th className="text-left py-2 pr-3 font-medium opacity-60">Assigned To</th>
                                        <th className="text-left py-2 pr-3 font-medium opacity-60">Status</th>
                                        <th className="py-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {rows.map((row, i) => (
                                        <tr
                                            key={i}
                                            className={
                                                row.rowStatus === "error"
                                                    ? "bg-red-50/50 dark:bg-red-950/20"
                                                    : row.rowStatus === "warn"
                                                    ? "bg-amber-50/50 dark:bg-amber-950/20"
                                                    : ""
                                            }
                                        >
                                            <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
                                            <td className="py-2 pr-3 max-w-xs">
                                                <div className="font-medium truncate">{row.subject || <span className="text-red-500 italic">empty</span>}</div>
                                                {row.description && <div className="text-muted-foreground truncate">{row.description}</div>}
                                            </td>
                                            <td className="py-2 pr-3">
                                                {row.story_points || <span className="text-muted-foreground">—</span>}
                                            </td>
                                            <td className="py-2 pr-3">
                                                {row.assigned_to_raw ? (
                                                    <span className={row.assigned_to_matched ? "text-foreground" : "text-amber-600 dark:text-amber-400"}>
                                                        {row.assigned_to_raw}
                                                        {!row.assigned_to_matched && " ⚠"}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="py-2 pr-3">
                                                {row.errors.length > 0 && (
                                                    <div className="space-y-0.5">
                                                        {row.errors.map((e, ei) => (
                                                            <div key={ei} className="text-red-600 dark:text-red-400 text-[10px]">{e}</div>
                                                        ))}
                                                    </div>
                                                )}
                                                {row.warnings.length > 0 && (
                                                    <div className="space-y-0.5">
                                                        {row.warnings.map((w, wi) => (
                                                            <div key={wi} className="text-amber-600 dark:text-amber-400 text-[10px]">{w}</div>
                                                        ))}
                                                    </div>
                                                )}
                                                {row.rowStatus === "ok" && <span className="text-green-600 dark:text-blue-400 text-[10px]">New</span>}
                                            </td>
                                            <td className="py-2">
                                                <button
                                                    onClick={() => removeRow(i)}
                                                    className="text-muted-foreground hover:text-destructive transition-colors text-[10px]"
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-border">
                            <Button size="sm" variant="outline" onClick={reset} className="h-7 px-3 text-xs">
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleImport}
                                disabled={hasBlockingErrors || rows.length === 0}
                                className="h-7 px-4 text-xs"
                            >
                                Add {rows.length} Stories to Kap
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // ── Progress Step ──────────────────────────────────────────────────────────
    if (step === "progress") {
        const pct = Math.round((progressIndex / rows.length) * 100)
        return (
            <div className="p-3 md:p-6 max-w-lg space-y-4">
                <Card className="bg-muted/40">
                    <CardHeader>
                        <CardTitle className="text-base">Importing Stories…</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">Please wait, do not close this page.</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Processing {progressIndex} of {rows.length}</span>
                                <span>{pct}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                                <div
                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                        {progressIndex > 0 && (
                            <div className="text-xs text-muted-foreground truncate">
                                Creating: <span className="text-foreground">{rows[progressIndex - 1]?.subject}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    // ── Summary Step ───────────────────────────────────────────────────────────
    const successCount = results.filter((r) => r.status === "success").length
    const failedCount = results.filter((r) => r.status === "failed").length

    return (
        <div className="p-3 md:p-6 space-y-4">
            <Card className="bg-muted/40">
                <CardHeader>
                    <CardTitle className="text-base">Import Complete</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-muted rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold">{results.length}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">Total</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{successCount}</div>
                            <div className="text-[10px] text-green-600 dark:text-green-500 mt-0.5">Success</div>
                        </div>
                        <div className={`rounded-lg p-3 text-center border ${failedCount > 0 ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" : "bg-muted border-transparent"}`}>
                            <div className={`text-2xl font-bold ${failedCount > 0 ? "text-red-700 dark:text-red-400" : "text-muted-foreground"}`}>{failedCount}</div>
                            <div className={`text-[10px] mt-0.5 ${failedCount > 0 ? "text-red-600 dark:text-red-500" : "text-muted-foreground"}`}>Failed</div>
                        </div>
                    </div>

                    {/* Failed rows detail */}
                    {failedCount > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-red-600 dark:text-red-400">Failed stories:</p>
                            <div className="space-y-1">
                                {results.filter((r) => r.status === "failed").map((r, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs bg-red-50/50 dark:bg-red-950/20 rounded px-2 py-1.5">
                                        <span className="text-red-500 shrink-0">✕</span>
                                        <div>
                                            <div className="font-medium">{r.subject}</div>
                                            {r.error && <div className="text-muted-foreground text-[10px]">{r.error}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t border-border">
                        <a href="/app/backlog" className="inline-flex items-center h-7 px-3 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/80 transition-colors font-medium">
                            Go to Backlog
                        </a>
                        <Button size="sm" variant="outline" onClick={reset} className="h-7 px-3 text-xs">
                            Import More
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default function BulkImportPage() {
    return (
        <Suspense>
            <BulkImportInner />
        </Suspense>
    )
}
