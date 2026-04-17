import {
  LayoutDashboard,
  BookOpen,
  Library,
  UsersRound,
  UserCog,
  Blend,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { SidebarSearch } from "@/components/SidebarSearch";

const userItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Lernmodule", url: "/modules", icon: BookOpen },
  { title: "Bibliothek", url: "/library", icon: Library },
];

const adminItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Lernmodule", url: "/modules", icon: BookOpen },
  { title: "Team-Übersicht", url: "/admin", icon: UsersRound },
  { title: "Benutzerverwaltung", url: "/users", icon: UserCog },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const { role, signOut, profile } = useAuth();
  const { competenceScore } = useApp();
  const isAdmin = role === "master_admin" || role === "admin";
  const items = isAdmin ? adminItems : userItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="pt-6">
        <div className={`px-4 mb-6 ${collapsed ? "text-center" : ""}`}>
          <div className="flex items-center gap-2">
            <Blend className="h-7 w-7 text-primary shrink-0" />
            {!collapsed && (
              <span className="font-display font-bold text-lg text-foreground">
                Nexpira<span className="text-primary">®</span>
              </span>
            )}
          </div>
        </div>

        <SidebarSearch collapsed={collapsed} />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/60"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && !isAdmin && (
          <div className="mx-4 mt-6 p-3 rounded-lg bg-sidebar-accent">
            <p className="text-xs text-muted-foreground mb-1">Kompetenz-Score</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent animate-fill-bar"
                  style={{ "--bar-width": `${competenceScore}%`, width: `${competenceScore}%` } as React.CSSProperties}
                />
              </div>
              <span className="badge-score text-xs">{competenceScore}%</span>
            </div>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        {!collapsed && (
          <>
            <div className="text-xs text-muted-foreground truncate px-1">
              {profile?.full_name || profile?.email || "Benutzer"}
              <span className="ml-1 text-primary capitalize">({role})</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={signOut}
            >
              <LogOut className="mr-1 h-3 w-3" /> Abmelden
            </Button>
          </>
        )}
        <Button variant="ghost" size="icon" className="w-full" onClick={toggleSidebar}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
