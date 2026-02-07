import { useState } from "react";
import {
  Inbox, 
  Calendar, 
  CalendarClock, 
  FileText, 
  CheckCircle2, 
  Hash, 
  Plus, 
  Search,
  LifeBuoy,
  StickyNote,
  Book,
  MoreVertical,
  MessageCircle,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Layers,
  ExternalLink,
  Trash2,
  MonitorPlay,
  Ban
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
import { useHiddenTabs } from "@/hooks/useHiddenTabs";
import { useExternalTools } from "@/contexts/ExternalToolsContext";
import { isKnownBlockedSite } from "@/utils/externalToolsEmbed";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddTaskDialog } from "@/components/AddTaskDialog";
import { AddExternalToolDialog } from "@/components/tools/AddExternalToolDialog";
import { ToolIcon } from "@/components/tools/ToolIcon";


const menuItems = [
  { title: "Entrada", url: "/", icon: Inbox, canHide: false },
  { title: "Hoje", url: "/hoje", icon: Calendar, canHide: true },
  { title: "Em breve", url: "/em-breve", icon: CalendarClock, canHide: true },
  { title: "Lembretes", url: "/lembretes-rapidos", icon: StickyNote, canHide: true },
  { title: "Chat", url: "/chat", icon: MessageCircle, canHide: false },
  { title: "Caderno", url: "/caderno", icon: Book, canHide: true },
  { title: "Flashcards", url: "/flashcards", icon: Layers, canHide: true },
  { title: "Resumos", url: "/resumos", icon: FileText, canHide: true },
  { title: "Concluído", url: "/concluido", icon: CheckCircle2, canHide: true },
];

const projects = [
  { 
    title: "Primeiros passos", 
    url: "/projetos/primeiros-passos"
  }
];

export function AppSidebar() {
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isAddToolDialogOpen, setIsAddToolDialogOpen] = useState(false);
  const { open, toggleSidebar } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const counts = useTaskCounts();
  const { isTabHidden } = useHiddenTabs();
  const { userTools, openAsTab, removeTool, updateTool, openTabs } = useExternalTools();

  const canActuallyEmbed = (tool: typeof userTools[0]) => {
    return tool.canEmbed && !isKnownBlockedSite(tool.url);
  };

  const isActive = (path: string) => currentPath === path;

  const getCount = (url: string) => {
    if (url === "/") return counts.entrada;
    if (url === "/hoje") return counts.hoje;
    if (url === "/projetos/primeiros-passos") return counts["primeiros-passos"];
    return 0;
  };

  return (
    <Sidebar className={open ? "w-56" : "w-12"} collapsible="icon">
      <SidebarContent className="gap-0 scrollbar-none [&::-webkit-scrollbar]:hidden">
        {/* Top Actions */}
        <div className="p-3 space-y-3">
          <Button 
            onClick={() => setIsAddTaskDialogOpen(true)}
            variant="outline"
            className="w-full justify-start gap-2 text-sm font-normal"
            size={open ? "default" : "icon"}
          >
            <Plus className="h-4 w-4" />
            {open && <span>Nova tarefa</span>}
          </Button>

          {open && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Buscar" 
                className="pl-9 h-8 text-sm bg-transparent"
              />
            </div>
          )}
        </div>

        {/* Main Menu */}
        <SidebarGroup className="px-2">
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems
                .filter(item => !isTabHidden(item.url))
                .map((item) => {
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
                              ? "bg-muted font-medium border-l-2 border-foreground rounded-l-none"
                              : "hover:bg-muted/50"
                          }
                        >
                          <item.icon className="h-4 w-4" />
                          {open && (
                            <>
                              <span className="flex-1 text-sm">{item.title}</span>
                              {count > 0 && (
                                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
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
        <SidebarGroup className="px-2 mt-4">
          <SidebarGroupLabel className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2">
            Projetos
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
                            ? "bg-muted font-medium"
                            : "hover:bg-muted/50"
                        }
                      >
                        <Hash className="h-4 w-4" />
                        {open && (
                          <>
                            <span className="flex-1 text-sm">{project.title}</span>
                            {count > 0 && (
                              <span className="ml-auto text-xs text-muted-foreground tabular-nums">
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

        {/* External Tools Section */}
        <SidebarGroup className="px-2 mt-4">
          <SidebarGroupLabel className="flex items-center justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2">
            <span>Ferramentas</span>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-5 w-5"
              onClick={() => setIsAddToolDialogOpen(true)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {userTools.map((tool) => {
                const isTabOpen = openTabs.some(t => t.id === tool.id);
                const isBlocked = isKnownBlockedSite(tool.url);
                const canEmbed = canActuallyEmbed(tool);
                
                if (!canEmbed) {
                  return (
                    <SidebarMenuItem key={tool.id} className="group relative">
                      <SidebarMenuButton asChild className="hover:bg-muted/50">
                        <a 
                          href={tool.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <div className="relative">
                            <ToolIcon 
                              icon={tool.icon} 
                              color={tool.iconColor} 
                              logoUrl={tool.logoUrl}
                              size={14} 
                            />
                          </div>
                          {open && (
                            <>
                              <span className="flex-1 truncate text-sm">{tool.name}</span>
                              <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                            </>
                          )}
                        </a>
                      </SidebarMenuButton>
                    
                      {open && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            >
                              <MoreVertical className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {isBlocked ? (
                              <DropdownMenuItem
                                disabled
                                className="gap-2 text-xs text-muted-foreground"
                              >
                                <Ban className="h-3 w-3" />
                                <span>Bloqueado</span>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  updateTool(tool.id, { canEmbed: true });
                                }}
                                className="gap-2 text-xs cursor-pointer"
                              >
                                <MonitorPlay className="h-3 w-3" />
                                <span>Abrir interno</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.preventDefault();
                                removeTool(tool.id);
                              }}
                              className="gap-2 text-xs cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Remover</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={tool.id} className="group relative">
                    <SidebarMenuButton 
                      onClick={() => openAsTab(tool)}
                      className="hover:bg-muted/50 cursor-pointer"
                    >
                      <div className="relative">
                        <ToolIcon 
                          icon={tool.icon} 
                          color={tool.iconColor} 
                          logoUrl={tool.logoUrl}
                          size={14} 
                        />
                        {isTabOpen && (
                          <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-foreground" />
                        )}
                      </div>
                      {open && (
                        <span className="flex-1 truncate text-sm">{tool.name}</span>
                      )}
                    </SidebarMenuButton>
                  
                    {open && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <MoreVertical className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault();
                              updateTool(tool.id, { canEmbed: false });
                            }}
                            className="gap-2 text-xs cursor-pointer"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Abrir externo</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault();
                              removeTool(tool.id);
                            }}
                            className="gap-2 text-xs cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Remover</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </SidebarMenuItem>
                );
              })}
              
              {userTools.length === 0 && open && (
                <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                  + para adicionar
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="px-2 pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/configuracoes"
                className={
                  currentPath.startsWith('/configuracoes')
                    ? "bg-muted font-medium"
                    : "hover:bg-muted/50"
                }
              >
                <Settings className="h-4 w-4" />
                {open && <span className="text-sm">Configurações</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="hover:bg-muted/50">
              <LifeBuoy className="h-4 w-4" />
              {open && <span className="text-sm">Ajuda</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={toggleSidebar}
              className="hover:bg-muted/50"
            >
              {open ? (
                <>
                  <PanelLeftClose className="h-4 w-4" />
                  <span className="text-sm">Minimizar</span>
                </>
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <AddTaskDialog 
        open={isAddTaskDialogOpen} 
        onOpenChange={setIsAddTaskDialogOpen} 
      />
      
      <AddExternalToolDialog
        open={isAddToolDialogOpen}
        onOpenChange={setIsAddToolDialogOpen}
      />
    </Sidebar>
  );
}
