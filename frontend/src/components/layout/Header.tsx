import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sun, Moon, LogOut, Menu, ShieldCheck, Terminal, Search } from 'lucide-react';
import { NotificationsDropdown } from './NotificationsDropdown';

interface HeaderProps {
  onToggleSidebar?: () => void;
  onSelectTab?: (tabId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onSelectTab }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border/60 bg-card/75 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-muted-foreground hover:text-foreground h-8 w-8"
          onClick={onToggleSidebar}
          aria-label="Abrir menu de navegação"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Brand identity */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
            <Terminal className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-semibold text-foreground tracking-tight text-sm sm:text-base">
                Central de Suporte
              </span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" title="Sistema operacional ativo" />
            </div>
            <p className="text-[10px] text-muted-foreground hidden sm:block font-medium leading-none">
              Painel Operacional Técnico
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Quick Search Trigger (Busca Global Ctrl+K) */}
        {onSelectTab && (
          <button
            type="button"
            onClick={() => onSelectTab('search-reports')}
            className="hidden md:flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 hover:bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Pesquisa Global e Relatórios (Atalho Ctrl+K)"
          >
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">Busca Global...</span>
            <kbd className="pointer-events-none hidden sm:inline-flex h-4 select-none items-center gap-0.5 rounded border border-border/70 bg-background/80 px-1 font-mono text-[9px] font-medium text-muted-foreground">
              <span>Ctrl</span>K
            </kbd>
          </button>
        )}

        {/* User Info Capsule */}
        {user && (
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1 text-xs">
            <div className="h-5 w-5 rounded bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center text-[10px] uppercase">
              {user.username.slice(0, 2)}
            </div>
            <span className="text-foreground font-medium">{user.username}</span>
            <Badge variant="outline" className="flex items-center gap-1 font-mono text-[10px] border-border/60 text-muted-foreground py-0 px-1.5">
              <ShieldCheck className="h-3 w-3 text-muted-foreground" />
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
          className="text-muted-foreground hover:text-foreground h-8 w-8 rounded-lg"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400 transition-transform hover:rotate-45" />
          ) : (
            <Moon className="h-4 w-4 text-slate-700 transition-transform hover:-rotate-12" />
          )}
        </Button>

        {/* Logout Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Sair</span>
        </Button>
      </div>
    </header>
  );
};
