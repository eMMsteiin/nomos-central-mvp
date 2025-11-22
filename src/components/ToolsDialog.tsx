import { Wrench, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useHiddenTabs } from "@/hooks/useHiddenTabs";
import {
  Inbox,
  Calendar,
  CalendarClock,
  Tag,
  CheckCircle2,
  StickyNote,
  Book
} from "lucide-react";

interface ToolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Map URLs to their icons
const iconMap: Record<string, any> = {
  "/": Inbox,
  "/hoje": Calendar,
  "/em-breve": CalendarClock,
  "/lembretes-rapidos": StickyNote,
  "/caderno": Book,
  "/filtros": Tag,
  "/concluido": CheckCircle2,
};

export function ToolsDialog({ open, onOpenChange }: ToolsDialogProps) {
  const { hiddenTabs, unhideTab } = useHiddenTabs();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Ferramentas
          </DialogTitle>
          <DialogDescription>
            Gerencie as funcionalidades e abas da sua área de trabalho
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-3">Abas Ocultas</h3>

            {hiddenTabs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <EyeOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma aba oculta</p>
                <p className="text-xs mt-1">
                  Passe o mouse sobre uma aba na barra lateral e clique no ícone de olho para ocultá-la
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {hiddenTabs.map((tab) => {
                  const Icon = iconMap[tab.url] || Inbox;
                  return (
                    <div
                      key={tab.url}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        <span className="font-medium">{tab.title}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => unhideTab(tab.url)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Desocultar
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
