import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import Index from "./pages/Index";
import EmBreve from "./pages/EmBreve";
import Filtros from "./pages/Filtros";
import Concluido from "./pages/Concluido";
import PrimeirosPassos from "./pages/PrimeirosPassos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            
            <div className="flex-1 flex flex-col w-full">
              <AppHeader />
              
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/hoje" element={<Index />} />
                  <Route path="/em-breve" element={<EmBreve />} />
                  <Route path="/filtros" element={<Filtros />} />
                  <Route path="/concluido" element={<Concluido />} />
                  <Route path="/projetos/primeiros-passos" element={<PrimeirosPassos />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
