"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createTimeEntry } from "@/lib/api/time"
import { mutate } from "swr"

const categoryMap: any = {
  CODING: "WORK",
  PLANNING: "WORK",
  "UNIT TESTING": "WORK",
  "TEAM MEETING": "NA",
  MISCELLANEOUS: "NA",
  TRAINING: "NA",
}

export default function TimeLogDialog({ taskId, projectId, taskHistory = [] }: any) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [hours, setHours] = useState("")
  const [comments, setComments] = useState("")
  const [category, setCategory] = useState("CODING")

  const handleSubmit = async () => {
    const type = categoryMap[category]

    await createTimeEntry(
      taskId,
      date,
      Number(hours),
      comments,
      category,
      type
    )

    // 🔥 refresh time entries
    mutate(key => Array.isArray(key) && key[0] === "time_entries")

    setOpen(false)
    setHours("")
    setComments("")
  }

  const handleReset = async () => {
    setDate(new Date().toISOString().split("T")[0])
    setHours("");
    setComments("");
    setCategory("CODING")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="secondary" className="h-6 px-4 text-[10px]">
            Time Log
          </Button>
        }
      />

      <DialogContent className="p-4 space-y-3 max-w-full min-h-[70vh] min-w-11/12">
        <div className="flex gap-4">
          <div className="space-y-3 grow">
            <DialogHeader>
              <DialogTitle className="text-sm">Log Time</DialogTitle>
            </DialogHeader>

            {/* Date */}
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 text-sm"
            />

            {/* Hours */}
            <Input
              type="number"
              placeholder="Hours"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="h-12 text-sm"
            />

            {/* Category */}
            {/* @ts-expect-error */}
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="min-h-10 text-sm w-1/2 min-w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(categoryMap).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>


            {/* Comments */}
            <Input
              placeholder="Comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="h-12 text-xs"
            />

            <Button onClick={handleSubmit} variant={"default"} className="h-8 text-sm px-12">
              Save
            </Button>

            <Button onClick={handleReset} variant="destructive" className="h-8 text-sm px-12 ml-6">
              Reset
            </Button>

          </div>

          <div className="grow space-y-2">

            <div className="text-xs font-medium opacity-70">
              Time Logs
            </div>

            <div className="max-h-100 overflow-y-auto space-y-2 pr-1">

              {taskHistory?.map((t: any) => {
                const category = t.custom_fields?.find((f: any) => f.id === 46)?.value
                const type = t.custom_fields?.find((f: any) => f.id === 47)?.value

                return (
                  <div
                    key={t.id}
                    className="py-2 px-6 rounded-md bg-muted/60 text-xs space-y-1"
                  >

                    {/* top row */}
                    <div className="flex justify-between">

                      <div className="font-medium">
                        {t.spent_on}
                      </div>

                      <div className="font-semibold text-lg text-foreground">
                        {t.hours}h
                      </div>

                    </div>

                    {/* meta */}
                    <div className="flex gap-3 opacity-70">

                      <span>
                        {category}
                      </span>

                      <span>
                        {type}
                      </span>

                      <span>
                        {t.user?.name}
                      </span>

                    </div>

                    {/* comments */}
                    {t.comments && (
                      <div className="opacity-80 line-clamp-2">
                        {t.comments}
                      </div>
                    )}

                  </div>
                )
              })}

              {taskHistory.length === 0 && (
                <div className="text-[10px] opacity-60">
                  No logs
                </div>
              )}

            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}