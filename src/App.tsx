import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { HiddenTabsProvider } from "@/contexts/HiddenTabsContext";
import { CanvaSessionProvider } from "@/contexts/CanvaSessionContext";
import { ExternalToolsProvider, useExternalTools } from "@/contexts/ExternalToolsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { FEATURES } from "@/config/features";
import { TasksSync } from "@/components/TasksSync";
import { FocusModeProvider } from "@/contexts/FocusModeContext";
import { FocusSidebar } from "@/components/canva/FocusSidebar";
import { FocusStatusBar } from "@/components/focus/FocusStatusBar";
import { ExternalToolsTabs } from "@/components/tools/ExternalToolsTabs";
import { ExternalToolView } from "@/components/tools/ExternalToolView";
import Index from "./pages/Index";
import Hoje from "./pages/Hoje";
import MinhaTrilha from "./pages/MinhaTrilha";
import EmBreve from "./pages/EmBreve";
import Resumos from "./pages/Resumos";
import Concluido from "./pages/Concluido";
import LembretesRapidos from "./pages/LembretesRapidos";
import Caderno from "./pages/Caderno";
import NotebookView from "./pages/NotebookView";
import CadernoDevTest from "./pages/CadernoDevTest";

import Flashcards from "./pages/Flashcards";
import ModoFoco from "./pages/ModoFoco";
import FocusSettingsPanel from "./components/configuracoes/FocusSettingsPanel";
import TemplatesPanel from "./components/configuracoes/TemplatesPanel";
import PrimeirosPassos from "./pages/PrimeirosPassos";
import Configuracoes from "./pages/Configuracoes";
import ConfiguracoesIntegracoes from "./pages/ConfiguracoesIntegracoes";
import TaskDetail from "./pages/TaskDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function MainContent() {
  const { openTabs, activeTabId, closeTab, closeAllTabs, setActiveTab } = useExternalTools();
  
  const activeTool = openTabs.find(t => t.id === activeTabId);

  return (
    <div className="flex-1 flex flex-col w-full">
      <FocusStatusBar />
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
        <ExternalToolView tool={activeTool} />
      
      ) : (
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/hoje" element={<Hoje />} />
            <Route path="/trilha" element={FEATURES.trilha ? <MinhaTrilha /> : <Navigate to="/" replace />} />
            <Route path="/em-breve" element={<EmBreve />} />
            <Route path="/resumos" element={FEATURES.resumos ? <Resumos /> : <Navigate to="/" replace />} />
            <Route path="/concluido" element={<Concluido />} />
            <Route path="/lembretes-rapidos" element={<LembretesRapidos />} />
            <Route path="/caderno" element={FEATURES.caderno ? <Caderno /> : <Navigate to="/" replace />} />
            <Route path="/caderno/:notebookId" element={FEATURES.caderno ? <NotebookView /> : <Navigate to="/" replace />} />
            
            <Route path="/caderno-dev-test" element={FEATURES.caderno ? <CadernoDevTest /> : <Navigate to="/" replace />} />
            
            <Route path="/flashcards" element={<Flashcards />} />
            <Route path="/modo-foco" element={<ModoFoco />} />
            <Route path="/tarefa/:id" element={<TaskDetail />} />
            <Route path="/tarefa/:id" element={<TaskDetail />} />
            <Route path="/projetos/primeiros-passos" element={<PrimeirosPassos />} />
            <Route path="/configuracoes" element={<Configuracoes />}>
              <Route path="modo-foco" element={<FocusSettingsPanel />} />
              <Route path="templates" element={<TemplatesPanel />} />
              <Route path="integracoes" element={<ConfiguracoesIntegracoes />} />
            </Route>
            <Route path="*" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      )}
    </div>
  );
}

function AppLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <TasksSync />
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <MainContent />
        <FocusSidebar />
      </div>
    </SidebarProvider>
  );
}

const VERSION = '13';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="fixed top-2 right-2 z-[9999] text-[10px] font-mono text-muted-foreground/50 pointer-events-none select-none">
          v{VERSION}
        </div>
        <BrowserRouter>
          <AuthProvider>
            <HiddenTabsProvider>
              <CanvaSessionProvider>
                <FocusModeProvider>
                  <ExternalToolsProvider>
                    <AppLayout />
                  </ExternalToolsProvider>
                </FocusModeProvider>
              </CanvaSessionProvider>
            </HiddenTabsProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
