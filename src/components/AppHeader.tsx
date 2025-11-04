import { Bell, LayoutGrid, LayoutList, MessageSquare, MoreVertical, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AppHeader() {
  return (
    <header className="border-b border-border px-4 py-2 flex items-center justify-between bg-background">
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="sm"
          className="gap-2 hover:bg-muted"
        >
          <Avatar className="h-6 w-6">
            <AvatarImage src="" />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">E</AvatarFallback>
          </Avatar>
          <span className="text-sm font-normal">Emmanuel</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
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

        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8 hover:bg-muted"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>

        <Button 
          variant="ghost" 
          size="sm"
          className="gap-2 px-3 hover:bg-muted"
        >
          <LayoutList className="h-4 w-4" />
          <span className="text-sm">Mostrar</span>
        </Button>

        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8 hover:bg-muted"
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
    </header>
  );
}
