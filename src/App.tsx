import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { HiddenTabsProvider } from "@/contexts/HiddenTabsContext";
import { CanvaSessionProvider } from "@/contexts/CanvaSessionContext";
import { ExternalToolsProvider, useExternalTools } from "@/contexts/ExternalToolsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { FocusSidebar } from "@/components/canva/FocusSidebar";
import { ExternalToolsTabs } from "@/components/tools/ExternalToolsTabs";
import { ExternalToolView } from "@/components/tools/ExternalToolView";
import Index from "./pages/Index";
import Hoje from "./pages/Hoje";
import EmBreve from "./pages/EmBreve";
import Resumos from "./pages/Resumos";
import Concluido from "./pages/Concluido";
import LembretesRapidos from "./pages/LembretesRapidos";
import Caderno from "./pages/Caderno";
import ChatNomos from "./pages/ChatNomos";
import Flashcards from "./pages/Flashcards";
import PrimeirosPassos from "./pages/PrimeirosPassos";
import Configuracoes from "./pages/Configuracoes";
import ConfiguracoesIntegracoes from "./pages/ConfiguracoesIntegracoes";
import TaskDetail from "./pages/TaskDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function MainContent() {
  const { openTabs, activeTabId, closeTab, closeAllTabs, setActiveTab, openAsPopout } = useExternalTools();
  
  const activeTool = openTabs.find(t => t.id === activeTabId);

  return (
    <div className="flex-1 flex flex-col w-full">
      <AppHeader />
      
      {/* External Tools Tabs Bar */}
      <ExternalToolsTabs
        openTabs={openTabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTab}
        onCloseTab={closeTab}
        onCloseAllTabs={closeAllTabs}
      />
      
      {/* Main Content Area */}
      {activeTool ? (
        <ExternalToolView 
          tool={activeTool} 
          onOpenPopout={openAsPopout}
        />
      ) : (
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/hoje" element={<Hoje />} />
            <Route path="/em-breve" element={<EmBreve />} />
            <Route path="/resumos" element={<Resumos />} />
            <Route path="/concluido" element={<Concluido />} />
            <Route path="/lembretes-rapidos" element={<LembretesRapidos />} />
            <Route path="/caderno" element={<Caderno />} />
            <Route path="/chat" element={<ChatNomos />} />
            <Route path="/flashcards" element={<Flashcards />} />
            <Route path="/tarefa/:id" element={<TaskDetail />} />
            <Route path="/projetos/primeiros-passos" element={<PrimeirosPassos />} />
            <Route path="/configuracoes" element={<Configuracoes />}>
              <Route path="integracoes" element={<ConfiguracoesIntegracoes />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      )}
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <HiddenTabsProvider>
            <CanvaSessionProvider>
              <ExternalToolsProvider>
                <SidebarProvider defaultOpen={true}>
                  <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <MainContent />
                    {/* Focus Sidebar - appears when Canva session is active */}
                    <FocusSidebar />
                  </div>
                </SidebarProvider>
              </ExternalToolsProvider>
            </CanvaSessionProvider>
          </HiddenTabsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
