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
  EyeOff,
  MoreVertical,
  MessageCircle,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Layers,
  ExternalLink,
  Trash2,
  MonitorPlay,
  Ban,
  Focus
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
import { useFocusMode } from "@/hooks/useFocusMode";
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
  { title: "Entrada", url: "/", icon: Inbox, color: "red", canHide: false },
  { title: "Hoje", url: "/hoje", icon: Calendar, canHide: true },
  { title: "Em breve", url: "/em-breve", icon: CalendarClock, canHide: true },
  { title: "Lembretes Rápidos", url: "/lembretes-rapidos", icon: StickyNote, canHide: true },
  { title: "Chat NOMOS", url: "/chat", icon: MessageCircle, color: "purple", canHide: false },
  { title: "Caderno Digital", url: "/caderno", icon: Book, canHide: true },
  { title: "Flashcards", url: "/flashcards", icon: Layers, color: "blue", canHide: true },
  { title: "Modo Foco", url: "/modo-foco", icon: Focus, color: "green", canHide: true },
  { title: "Resumos", url: "/resumos", icon: FileText, canHide: true },
  { title: "Concluído", url: "/concluido", icon: CheckCircle2, canHide: true },
];

const projects = [
  { 
    title: "Primeiros passos", 
    emoji: "👋",
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
  const { isTabHidden, hideTab } = useHiddenTabs();
  const { userTools, openAsTab, removeTool, updateTool, openTabs } = useExternalTools();
  const { state: focusState } = useFocusMode();

  // Check if tool can actually embed (considering blocked sites)
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
    <Sidebar className={open ? "w-64" : "w-14"} collapsible="icon">
      <SidebarContent className="gap-0">
        {/* Top Actions */}
        <div className="p-2 space-y-2">
          <Button 
            onClick={() => setIsAddTaskDialogOpen(true)}
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
              {menuItems
                .filter(item => !isTabHidden(item.url))
                .map((item) => {
                  const active = isActive(item.url);
                  const count = getCount(item.url);
                  return (
                    <SidebarMenuItem key={item.title} className="group relative">
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
                            style={
                              item.color === "red" && active ? { color: "hsl(var(--todoist-red))" } : 
                              item.color === "purple" ? { color: "hsl(270, 70%, 60%)" } : 
                              item.color === "blue" ? { color: "hsl(200, 70%, 50%)" } :
                              item.color === "green" ? { color: "hsl(142, 70%, 45%)" } : undefined
                            }
                          />
                          {open && (
                            <>
                              <span className="flex-1">{item.title}</span>
                              {/* Show focus indicator for Modo Foco when active */}
                              {item.url === '/modo-foco' && focusState.active && (
                                <span className="ml-auto h-2 w-2 rounded-full bg-primary animate-pulse" />
                              )}
                              {count > 0 && (
                                <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[hsl(var(--todoist-count-bg))] text-[hsl(var(--todoist-count-text))]">
                                  {count}
                                </span>
                              )}
                            </>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                      
                      {/* Three dots menu (appears on hover) */}
                      {open && item.canHide && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            >
                              <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.preventDefault();
                                hideTab(item.url, item.title);
                              }}
                              className="gap-2 text-sm cursor-pointer"
                            >
                              <EyeOff className="h-3.5 w-3.5" />
                              <span>Ocultar aba</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
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

        {/* External Tools Section */}
        <SidebarGroup className="px-2">
          <SidebarGroupLabel className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase">
            <span>Ferramentas</span>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-5 w-5 hover:bg-muted"
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
                
                // For blocked tools, render as direct link
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
                              size={16} 
                            />
                          </div>
                          {open && (
                            <>
                              <span className="flex-1 truncate">{tool.name}</span>
                              <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                            </>
                          )}
                        </a>
                      </SidebarMenuButton>
                    
                      {/* Remove tool menu for external tools */}
                      {open && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            >
                              <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {isBlocked ? (
                              <DropdownMenuItem
                                disabled
                                className="gap-2 text-sm text-muted-foreground"
                              >
                                <Ban className="h-3.5 w-3.5" />
                                <span>Bloqueado pelo site</span>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  updateTool(tool.id, { canEmbed: true });
                                }}
                                className="gap-2 text-sm cursor-pointer"
                              >
                                <MonitorPlay className="h-3.5 w-3.5" />
                                <span>Abrir dentro da NOMOS</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.preventDefault();
                                removeTool(tool.id);
                              }}
                              className="gap-2 text-sm cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Remover</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </SidebarMenuItem>
                  );
                }

                // For embeddable tools, render as button that opens as tab
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
                          size={16} 
                        />
                        {isTabOpen && (
                          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      {open && (
                        <span className="flex-1 truncate">{tool.name}</span>
                      )}
                    </SidebarMenuButton>
                  
                    {/* Tool menu for embeddable tools */}
                    {open && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault();
                              updateTool(tool.id, { canEmbed: false });
                            }}
                            className="gap-2 text-sm cursor-pointer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Abrir em janela externa</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault();
                              removeTool(tool.id);
                            }}
                            className="gap-2 text-sm cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
                  Clique em + para adicionar ferramentas
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
                to="/configuracoes/integracoes"
                className={
                  currentPath.startsWith('/configuracoes')
                    ? "bg-[hsl(var(--todoist-orange-bg))] text-foreground font-medium"
                    : "hover:bg-muted/50"
                }
              >
                <Settings className="h-4 w-4" />
                {open && <span>Configurações</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="hover:bg-muted/50">
              <LifeBuoy className="h-4 w-4" />
              {open && <span>Ajuda e recursos</span>}
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
                  <span>Minimizar</span>
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
