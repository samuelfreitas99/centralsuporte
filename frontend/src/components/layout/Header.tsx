import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sun, Moon, LogOut, Menu, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6">
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
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
          <span className="font-semibold text-foreground tracking-tight">Central de Suporte</span>
          <span className="hidden text-xs text-muted-foreground sm:inline-block border-l border-border pl-2">
            Operação Interna
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* User Badge */}
        {user && (
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <span className="text-foreground font-medium">{user.username}</span>
            <Badge variant="secondary" className="flex items-center gap-1 font-mono text-[10px] uppercase">
              <ShieldCheck className="h-3 w-3 text-primary" />
              {user.role?.name || 'Geral'}
            </Badge>
          </div>
        )}

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={`Alternar para tema ${theme === 'dark' ? 'claro' : 'escuro'}`}
          className="text-muted-foreground hover:text-foreground"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Logout Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center gap-1.5"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden md:inline">Sair</span>
        </Button>
      </div>
    </header>
  );
};
