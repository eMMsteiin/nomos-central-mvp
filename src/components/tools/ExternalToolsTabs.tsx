import { X } from "lucide-react";
import { ExternalTool } from "@/types/externalTool";
import { ToolIcon } from "./ToolIcon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExternalToolsTabsProps {
  openTabs: ExternalTool[];
  activeTabId: string | null;
  onSelectTab: (toolId: string) => void;
  onCloseTab: (toolId: string) => void;
  onCloseAllTabs: () => void;
}

export function ExternalToolsTabs({
  openTabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onCloseAllTabs,
}: ExternalToolsTabsProps) {
  if (openTabs.length === 0) return null;

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-muted/30 border-b border-border overflow-x-auto">
      {openTabs.map((tool) => (
        <div
          key={tool.id}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-all",
            "text-sm font-medium min-w-0 max-w-[180px] group",
            activeTabId === tool.id
              ? "bg-background shadow-sm border border-border"
              : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onSelectTab(tool.id)}
        >
          <ToolIcon icon={tool.icon} color={tool.iconColor} size={14} />
          <span className="truncate flex-1">{tool.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onCloseTab(tool.id);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      
      {openTabs.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground ml-1"
          onClick={onCloseAllTabs}
        >
          Fechar todas
        </Button>
      )}
    </div>
  );
}
