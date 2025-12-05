import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Settings, Plug } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/configuracoes', icon: Settings, label: 'Geral', end: true },
  { to: '/configuracoes/integracoes', icon: Plug, label: 'Integrações' },
];

export default function Configuracoes() {
  const location = useLocation();
  const isRoot = location.pathname === '/configuracoes';

  return (
    <div className="flex flex-col md:flex-row min-h-full">
      {/* Sidebar Navigation */}
      <nav className="w-full md:w-56 border-b md:border-b-0 md:border-r border-border p-4 space-y-1">
        <h2 className="text-lg font-semibold mb-4 px-2">Configurações</h2>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Content Area */}
      <div className="flex-1">
        {isRoot ? (
          <div className="p-6 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-foreground mb-2">Configurações Gerais</h1>
            <p className="text-muted-foreground mb-6">
              Personalize sua experiência na NOMOS
            </p>
            
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <Settings className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                Configurações gerais em breve...
              </p>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </div>
    </div>
  );
}
