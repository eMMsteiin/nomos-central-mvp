import { Bell, LayoutGrid, LayoutList, MessageSquare, MoreVertical, ChevronDown, Wrench, User, Settings, LogOut, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToolsDialog } from "@/components/ToolsDialog";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "@/components/ui/sidebar";

export function AppHeader() {
  const [isToolsDialogOpen, setIsToolsDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  return (
    <header className="border-b border-border px-2 sm:px-4 py-2 flex items-center justify-between bg-background">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile sidebar trigger */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-muted"
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="gap-1 sm:gap-2 hover:bg-muted px-2 sm:px-3"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src="" />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">E</AvatarFallback>
              </Avatar>
              <span className="text-sm font-normal hidden sm:inline">Emmanuel</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="start" className="w-48 bg-popover z-50">
            <DropdownMenuItem>
              <User className="h-4 w-4 mr-2" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsToolsDialogOpen(true)}>
              <Wrench className="h-4 w-4 mr-2" />
              Ferramentas
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/configuracoes')}>
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8 relative hover:bg-muted"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-[hsl(var(--todoist-red))] rounded-full"></span>
        </Button>

        {/* Hide on mobile */}
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8 hover:bg-muted hidden sm:flex"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>

        <Button 
          variant="ghost" 
          size="sm"
          className="gap-2 px-2 sm:px-3 hover:bg-muted hidden md:flex"
        >
          <LayoutList className="h-4 w-4" />
          <span className="text-sm hidden lg:inline">Mostrar</span>
        </Button>

        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8 hover:bg-muted hidden sm:flex"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>

        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8 hover:bg-muted"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>

      <ToolsDialog open={isToolsDialogOpen} onOpenChange={setIsToolsDialogOpen} />
    </header>
  );
}
