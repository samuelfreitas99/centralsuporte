import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { X, ExternalLink, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NAV_ITEMS } from './nav-items';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tabId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
}) => {
  const { hasPermission, user } = useAuth();

  const filteredItems = NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  const operationalItems = filteredItems.filter((i) => i.section === 'operacional' || !i.section);
  const systemItems = filteredItems.filter((i) => i.section === 'sistema');

  const renderNavGroup = (title: string, items: typeof filteredItems) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
          {title}
        </p>
        <div className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={cn(
                  'group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20 font-semibold'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-3.5 bg-primary rounded-full" />
                )}
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                <span className="flex-1 truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border/60 bg-card/95 lg:bg-card/40 backdrop-blur-md transition-transform duration-200 lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile Header / Close Button */}
        <div className="flex h-14 items-center justify-between border-b border-border/60 px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="font-semibold text-foreground font-heading text-sm">Menu Operacional</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar menu" className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* User Info Capsule (Mobile only) */}
        {user && (
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/60 lg:hidden bg-muted/20">
            <div className="h-7 w-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase">
              {user.username.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user.username}</p>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-primary" />
                <span>{user.role?.name || 'Geral'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          {renderNavGroup('Operação & Diagnóstico', operationalItems)}
          {renderNavGroup('Inventário & Sistema', systemItems)}
        </nav>

        {/* OTRS Complementary Warning Card */}
        <div className="border-t border-border/60 p-3">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-semibold text-foreground/90 mb-1">
              <span>Chamados no OTRS</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground/80">
              O OTRS é o sistema oficial de chamados. A Central armazena diagnósticos, comandos e procedimentos técnicos internos.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
