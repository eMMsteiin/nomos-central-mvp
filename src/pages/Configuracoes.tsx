import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Settings, Plug, Focus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFocusMode } from '@/hooks/useFocusMode';

const navItems = [
  { to: '/configuracoes', icon: Settings, label: 'Geral', end: true },
  { to: '/configuracoes/modo-foco', icon: Focus, label: 'Modo Foco' },
  { to: '/configuracoes/integracoes', icon: Plug, label: 'Integrações' },
];

export default function Configuracoes() {
  const location = useLocation();
  const { state: focusState } = useFocusMode();
  const isRoot = location.pathname === '/configuracoes';

  return (
    <div className="flex flex-col md:flex-row min-h-full">
      {/* Sidebar Navigation */}
      <nav className="w-full md:w-48 p-4 space-y-1">
        <h2 className="text-sm font-medium mb-4 px-2">Configurações</h2>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 px-3 py-2 rounded-sm text-sm transition-colors",
                isActive
                  ? "bg-muted font-medium"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )
            }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              {item.to === '/configuracoes/modo-foco' && focusState.active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-foreground" />
              )}
            </NavLink>
          ))}
        </nav>

      {/* Content Area */}
      <div className="flex-1">
        {isRoot ? (
          <div className="p-6 max-w-2xl">
            <h1 className="text-base font-medium text-foreground mb-2">Geral</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Personalize sua experiência
            </p>
            
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Em breve
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
