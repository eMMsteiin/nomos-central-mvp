import { 
  Inbox, 
  Calendar, 
  CalendarClock, 
  Tag, 
  CheckCircle2, 
  Hash, 
  Plus, 
  Search,
  LifeBuoy,
  Users
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTaskCounts } from "@/hooks/useTaskCounts";

const menuItems = [
  { title: "Entrada", url: "/", icon: Inbox, color: "red" },
  { title: "Hoje", url: "/hoje", icon: Calendar },
  { title: "Em breve", url: "/em-breve", icon: CalendarClock },
  { title: "Filtros e Etiquetas", url: "/filtros", icon: Tag },
  { title: "Concluído", url: "/concluido", icon: CheckCircle2 },
];

const projects = [
  { 
    title: "Primeiros passos", 
    emoji: "👋",
    url: "/projetos/primeiros-passos"
  }
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const counts = useTaskCounts();

  const isActive = (path: string) => currentPath === path;

  const getCount = (url: string) => {
    if (url === "/") return counts.entrada;
    if (url === "/hoje") return counts.hoje;
    if (url === "/projetos/primeiros-passos") return counts["primeiros-passos"];
    return 0;
  };

  return (
    <Sidebar className={open ? "w-64" : "w-14"} collapsible="icon">
      <SidebarContent className="gap-0">
        {/* Top Actions */}
        <div className="p-2 space-y-2">
          <Button 
            className="w-full justify-start gap-2 bg-[hsl(var(--todoist-red-bg))] text-[hsl(var(--todoist-red))] hover:bg-[hsl(var(--todoist-red-hover))] font-medium border-0"
            size={open ? "default" : "icon"}
          >
            <Plus className="h-4 w-4" />
            {open && <span>Adicionar tarefa</span>}
          </Button>

          {open && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar" 
                className="pl-9 h-9 bg-muted border-0"
              />
            </div>
          )}
        </div>

        {/* Main Menu */}
        <SidebarGroup className="px-2">
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const active = isActive(item.url);
                const count = getCount(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={
                          active
                            ? "bg-[hsl(var(--todoist-orange-bg))] text-foreground font-medium border-l-2 border-[hsl(var(--todoist-red))] rounded-l-none"
                            : "hover:bg-muted/50"
                        }
                      >
                        <item.icon 
                          className="h-4 w-4" 
                          style={item.color === "red" && active ? { color: "hsl(var(--todoist-red))" } : undefined}
                        />
                        {open && (
                          <>
                            <span className="flex-1">{item.title}</span>
                            {count > 0 && (
                              <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[hsl(var(--todoist-count-bg))] text-[hsl(var(--todoist-count-text))]">
                                {count}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Projects Section */}
        <SidebarGroup className="px-2">
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase">
            Meus projetos
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.map((project) => {
                const active = isActive(project.url);
                const count = getCount(project.url);
                return (
                  <SidebarMenuItem key={project.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={project.url}
                        className={
                          active
                            ? "bg-[hsl(var(--todoist-orange-bg))] text-foreground font-medium"
                            : "hover:bg-muted/50"
                        }
                      >
                        <Hash className="h-4 w-4" />
                        {open && (
                          <>
                            <span className="flex-1">
                              {project.title} {project.emoji}
                            </span>
                            {count > 0 && (
                              <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[hsl(var(--todoist-count-bg))] text-[hsl(var(--todoist-count-text))]">
                                {count}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="px-2 pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="hover:bg-muted/50">
              <Plus className="h-4 w-4" />
              {open && <span>Adicionar uma equipe</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="hover:bg-muted/50">
              <LifeBuoy className="h-4 w-4" />
              {open && <span>Ajuda e recursos</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
