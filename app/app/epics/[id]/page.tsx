/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useParams } from "next/navigation"
import { getEpicById, getStoriesByEpicId } from "@/lib/api/epic"
import useSWR from "swr"

import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import StoryCard from "@/components/story-card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getCurrentUser } from "@/lib/api/user"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {  useState } from "react"
import { ApiConfig } from "@/lib/utils"

export function SwitchDemo() {
  return (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" />
      <Label htmlFor="airplane-mode">Airplane Mode</Label>
    </div>
  )
}

export default function EpicPage() {

  const { data: user } = useSWR(
    ["user"],
    getCurrentUser, ApiConfig
  )

  const { id } = useParams()

  const { data } = useSWR(["epic", id], () =>
    getEpicById(id as string), ApiConfig
  )



  const roles = user?.memberships?.map((mm : {project : {id : number} , roles : any[]}) => mm.project?.id === data?.project?.id ? mm?.roles ?? [] : []).flat()?.sort((a: any, b: any) => a.id - b.id);
  const isAdmin = roles?.some((role: { id: number }) => role.id == 6)

  const { data: userStories } = useSWR(["epicStories", id, isAdmin], () =>
    getStoriesByEpicId(id as string, isAdmin), ApiConfig
  )

  const users = [...new Set(userStories?.map((us: any) => us?.assigned_to?.name))]
  const [showUsers, setShowUsers] = useState([`${user?.firstname} ${user?.lastname}`])

  const toggleUr = (username: any) => {
    if (showUsers?.includes(username)) setShowUsers(showUsers?.filter(v => v !== username))
    else setShowUsers(v => [...v, username])
  }

  if (!data) return <div className="p-4">Loading...</div>


  const storyPoints =
    data.custom_fields?.find((f: any) =>
      f.name.includes("Story Point")
    )?.value || "0"

  const actualStart =
    data.custom_fields?.find((f: any) =>
      f.name.includes("Actual Start")
    )?.value

  const actualEnd =
    data.custom_fields?.find((f: any) =>
      f.name.includes("Actual End")
    )?.value

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <Card className="bg-muted/40">
        <CardHeader className="space-y-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">
              {data.subject}
            </CardTitle>

            <div className="flex gap-2">
              <div className="flex gap-2 items-center">
                <Badge variant="outline">{data.priority?.name}</Badge>

                <Select>
                  <SelectTrigger disabled={!isAdmin} className="h-7 text-xs w-30">
                    <SelectValue placeholder={data.status?.name} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            #{data.id} • {data.project?.name}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* CORE INFO */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">

            <div>
              <div className="opacity-60">Assigned</div>
              <div className="text-sm">{data.assigned_to?.name || "-"}</div>
            </div>

            <div>
              <div className="opacity-60">Author</div>
              <div className="text-sm">{data.author?.name}</div>
            </div>

            <div>
              <div className="opacity-60">Story Points</div>
              <div className="text-sm">{storyPoints}</div>
            </div>

            <div>
              <div className="opacity-60">Status</div>
              <div className="text-sm">{data.status?.name}</div>
            </div>

            <div>
              <div className="opacity-60">Start</div>
              <div className="text-sm">{data.start_date || "-"}</div>
            </div>

            <div>
              <div className="opacity-60">Due</div>
              <div className="text-sm">{data.due_date || "-"}</div>
            </div>

          </div>

          {/* DATES */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">

            <div>
              <div className="opacity-60">Actual Start</div>
              <div className="text-sm">{actualStart || "-"}</div>
            </div>

            <div>
              <div className="opacity-60">Actual End</div>
              <div className="text-sm">{actualEnd || "-"}</div>
            </div>

            <div>
              <div className="opacity-60">Est. Hours</div>
              <div className="text-sm">{data.total_estimated_hours || "-"}</div>
            </div>

            <div>
              <div className="opacity-60">Spent Hours</div>
              <div className="text-sm">{data.total_spent_hours || "-"}</div>
            </div>

            <div>
              <div className="opacity-60">Progress</div>
              <div className="text-sm">{data.done_ratio || 0}%</div>
            </div>

          </div>

        </CardContent>
      </Card>

      {/* CHILDREN TREE */}
      <Card className="bg-muted/40">
        <CardHeader>
          <CardTitle className="text-sm">User Stories & Tasks</CardTitle>
          <div className="flex gap-2">
            {users?.map((ur : any) => {
              return <Badge className="cursor-pointer" onClick={() => toggleUr(ur)} variant={showUsers?.includes(ur) ? "default" : "outline"} key={`user:${ur}`}>{ur as string}</Badge>
            })}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {userStories?.filter((story: any) => {
            return showUsers?.includes(story?.assigned_to?.name) ?? false
          })?.map((story: any) => (
            <StoryCard key={story.id} story={story} isAdmin={isAdmin} />
          ))}
        </CardContent>

      </Card>

      {/* JOURNALS */}
      <Card className="bg-muted/40">
        <CardHeader>
          <CardTitle className="text-sm">Activity</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">

          {data.journals?.map((j: any) => (
            <div key={j.id} className="space-y-1 text-xs">

              <div className="flex justify-between text-muted-foreground">
                <span>{j.user?.name}</span>
                <span>{j.created_on}</span>
              </div>

              {/* NOTES */}
              {j.notes && (
                <div className="text-sm">{j.notes}</div>
              )}

              {/* CHANGES */}
              {j.details?.map((d: any, i: number) => (
                <div key={i} className="text-muted-foreground">
                  {d.name} : {d.old_value} → {d.new_value}
                </div>
              ))}

              <Separator />
            </div>
          ))}

        </CardContent>
      </Card>

    </div>
  )
}