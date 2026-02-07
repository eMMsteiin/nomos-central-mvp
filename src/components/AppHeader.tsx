import { Bell, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
    <header className="border-b border-border px-4 py-3 flex items-center justify-between bg-background">
      <div className="flex items-center gap-3">
        {/* Mobile sidebar trigger */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleSidebar}
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="gap-2 px-2 text-sm font-normal"
            >
              <span className="h-6 w-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-medium">
                E
              </span>
              <span className="hidden sm:inline">Emmanuel</span>
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="start" className="w-48 bg-popover">
            <DropdownMenuItem className="text-sm">
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsToolsDialogOpen(true)} className="text-sm">
              Ferramentas
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/configuracoes')} className="text-sm">
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-sm">
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8 relative"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-foreground rounded-full"></span>
        </Button>
      </div>

      <ToolsDialog open={isToolsDialogOpen} onOpenChange={setIsToolsDialogOpen} />
    </header>
  );
}
