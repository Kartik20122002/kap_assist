"use client"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { IconSelector, IconSparkles, IconRosetteDiscountCheck, IconLogout } from "@tabler/icons-react"
import { Badge } from "./ui/badge"
import { toast } from "sonner"
import { useRouter } from "next/navigation"


export function NavUser({
  user, projectId
}: {
  user: {
    id: number
    name: string
    email: string
    avatar: string,
    memberships: any[]
  }, projectId: any
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()

  const roles = user?.memberships?.map((mm) => mm?.project?.id == projectId ? mm?.roles ?? [] : []).flat()?.sort((a, b) => a.id - b.id);

  const handleUpgrade = () => {
    toast("🚀 This is the upgrade bro", {
      description: "Congratulations! You are now on the Pro plan. Nothing has changed. Enjoy! 🎉",
      duration: 5000,
    })
  }

  const handleAccount = () => {
    window.open("https://kap01.kpit.com/kap/my/account", "_blank")
  }

  const handleLogout = () => {
    localStorage.removeItem("apiKey")
    localStorage.removeItem("selectedProject")
    router.push("/login")
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Avatar>
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className={"bg-primary"}>{user.name?.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs">
                {user.email}
                <Badge variant={"default"} className="px-2 py-0.5 text-[9px] min-h-0 h-lh ml-2" >{roles?.[0]?.name}</Badge>
              </span>
            </div>
            <IconSelector className="ml-auto size-4" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* User info header */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar>
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{user.name?.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* Upgrade to Pro */}
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleUpgrade} className="cursor-pointer">
                <IconSparkles />
                Upgrade to Pro
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* Account */}
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleAccount} className="cursor-pointer">
                <IconRosetteDiscountCheck />
                Account
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* Logout */}
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
              <IconLogout />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
