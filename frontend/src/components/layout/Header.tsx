import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sun, Moon, LogOut, Menu, ShieldCheck, Terminal } from 'lucide-react';
import { NotificationsDropdown } from './NotificationsDropdown';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border/80 bg-card/70 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-muted-foreground hover:text-foreground"
          onClick={onToggleSidebar}
          aria-label="Abrir menu de navegação"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-foreground tracking-tight text-base sm:text-lg">
                Central de Suporte
              </span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground hidden sm:block font-medium">
              Painel Operacional Técnico
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* User Info Capsule */}
        {user && (
          <div className="hidden sm:flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/30 px-3 py-1.5 text-xs">
            <div className="h-6 w-6 rounded-lg bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px] uppercase">
              {user.username.slice(0, 2)}
            </div>
            <span className="text-foreground font-semibold">{user.username}</span>
            <Badge variant="secondary" className="flex items-center gap-1 font-mono text-[10px] uppercase">
              <ShieldCheck className="h-3 w-3 text-blue-400" />
              {user.role?.name || 'Geral'}
            </Badge>
          </div>
        )}

        {/* Notifications & Reactive Rules Dropdown */}
        <NotificationsDropdown />

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={`Alternar para tema ${theme === 'dark' ? 'claro' : 'escuro'}`}
          className="text-muted-foreground hover:text-foreground hover:bg-white/[0.06] rounded-xl"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400 transition-transform hover:rotate-45" />
          ) : (
            <Moon className="h-4 w-4 text-blue-600 transition-transform hover:-rotate-12" />
          )}
        </Button>

        {/* Logout Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl flex items-center gap-1.5 text-xs font-semibold"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Sair</span>
        </Button>
      </div>
    </header>
  );
};
