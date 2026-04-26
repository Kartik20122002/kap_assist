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
} from "@tabler/icons-react"

import { getCurrentUser } from "@/lib/api/user"
import { getProjects } from "@/lib/api/project"
import { getEpicById, getEpics } from "@/lib/api/epic"
import useSWR from "swr"
import { getTimeEntries } from "@/lib/api/time"
import { ApiConfig } from "@/lib/utils"
import { useRouter } from "next/navigation"



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
      id: user.id,
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

  const { data: epics } = useSWR(selectedProject?.id ? ["epic", selectedProject.id] : null, () =>
    getEpics(selectedProject.id), ApiConfig
  )



  const epicList = epics?.map((e: any) => {
    return {
      title: e.subject,
      url: `/app/epics/${e.id}`,
      icon: <IconFrame />,
      projectId: selectedProject?.id
    }
  })


  const { data: time_entries } = useSWR(selectedProject?.id ? ["time_entries", selectedProject.id, user.id] : null, () =>
    getTimeEntries(selectedProject.id, user.id), ApiConfig
  )

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} setActiveProject={setProject} activeProject={selectedProject} />
      </SidebarHeader>

      <SidebarContent>
        <NavMain epics={epicList} time_entries={time_entries} />
      </SidebarContent>

      <SidebarFooter>
        {userData && <NavUser user={userData} projectId={selectedProject.id} />}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}