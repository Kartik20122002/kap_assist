"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

import {
  IconLayoutRows,
  IconWaveSine,
  IconCommand,
  IconFrame,
  IconTarget,
} from "@tabler/icons-react"

import { getCurrentUser } from "@/lib/api/user"
import { getProjects } from "@/lib/api/project"
import { getSprints } from "@/lib/api/sprint"
import useSWR from "swr"
import { getTimeEntries } from "@/lib/api/time"
import { ApiConfig } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { SprintList } from "@/components/sprint-list"
import { useEffect } from "react"
import { toast } from "sonner"



export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

  const { data: user } = useSWR(
    ["user"],
    getCurrentUser, ApiConfig
  )

  const router = useRouter()


  const userData = user
    ? {
      name: `${user.firstname} ${user.lastname}`,
      email: user.login,
      id: user?.id,
      memberships: user?.memberships ?? [],
      avatar: "",
    }
    : undefined

  const { data: projects } = useSWR(
    ["projects"],
    getProjects, ApiConfig
  )


  const data = {
    teams: projects?.map((p: any) => {
      return ({
        name: p.name,
        logo: <IconLayoutRows />,
        id: p.id
      })
    })
  }

  const [selectedProject, setSelectedProject] = React.useState({ id: 0 });

  const setProject = (v: any) => {
    localStorage.setItem("selectedProject", v.id)
    setSelectedProject(v)
    router.push("/app")
  }

  const { data: sprints } = useSWR(selectedProject?.id ? ["sprints", selectedProject?.id] : null, () =>
    getSprints(selectedProject?.id), ApiConfig
  )

  // Transform sprints data to match Sprint interface
  const sprintList = sprints?.versions?.map((s: any) => {
    return {
      id: s.id,
      name: s.name,
      status: s.status,
      due_date: s.due_date,
      created_on: s.created_on,
      icon: <IconTarget className="size-4" />,
      projectId: selectedProject?.id
    }
  }).sort((a: any, b: any) => {
    return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
  })
    ?? []


  const { data: time_entries } = useSWR(
    (selectedProject?.id && user?.id) ? ["time_entries", selectedProject.id, user?.id] : null,
    () => getTimeEntries(selectedProject?.id, user?.id),
    ApiConfig
  )

  // A9 — Today's timelog is under 9 hours (warn at end of day ≥ 17:00)
  useEffect(() => {
    if (!time_entries || !user) return
    const currentHour = new Date().getHours()
    if (currentHour < 17) return  // only warn after 5pm

    const today = new Date().toISOString().split("T")[0]
    const todayHours = time_entries
      .filter((t: any) => t.spent_on === today)
      .reduce((sum: number, t: any) => sum + t.hours, 0)

    if (todayHours < 9) {
      toast.warning(`You've only logged ${todayHours}h today`, {
        id: "timelog-today",
        description: "Don't forget to fill your timesheet before you wrap up!",
        duration: 8000,
      })
    }
  }, [time_entries])

  // Calculate if user is admin for the selected project
  const isAdmin = React.useMemo(() => {
    if (!user?.memberships || selectedProject?.id === 0) return false
    const projectMembership = user.memberships.find((m: any) => m.project?.id === selectedProject?.id)
    return projectMembership?.roles?.some((role: any) => role.id === 6) ?? false
  }, [user?.memberships, selectedProject?.id])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data?.teams} setActiveProject={setProject} activeProject={selectedProject} />
      </SidebarHeader>

      <SidebarContent>
        <SprintList sprints={sprintList} icon={<IconTarget className="size-4" />} projectId={selectedProject?.id} isAdmin={isAdmin} />
        <NavMain time_entries={time_entries} />
      </SidebarContent>

      <SidebarFooter>
        {userData && <NavUser user={userData} projectId={selectedProject?.id} />}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}