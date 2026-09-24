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
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
          {title}
        </p>
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
                'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 text-left cursor-pointer',
                isActive
                  ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/10 text-white border border-blue-500/30 shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]'
                  : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 rounded-r-full shadow-[0_0_8px_#3b82f6]" />
              )}
              <Icon
                className={cn(
                  'h-4 w-4 transition-transform duration-200 group-hover:scale-110',
                  isActive ? 'text-blue-400' : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              <span className="flex-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border/80 bg-card/95 lg:bg-card/60 backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile Header / Close Button */}
        <div className="flex h-16 items-center justify-between border-b border-border/80 px-6 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
            <span className="font-bold text-foreground font-heading">Menu Operacional</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* User Info Capsule (Mobile only) */}
        {user && (
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/60 lg:hidden bg-muted/20">
            <div className="h-8 w-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs uppercase">
              {user.username.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{user.username}</p>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-blue-400" />
                <span>{user.role?.name || 'Geral'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 space-y-6 overflow-y-auto p-4">
          {renderNavGroup('Operação & Diagnóstico', operationalItems)}
          {renderNavGroup('Inventário & Sistema', systemItems)}
        </nav>

        {/* OTRS Complementary Warning Card */}
        <div className="border-t border-border/80 p-4">
          <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-3.5 text-xs text-muted-foreground relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center gap-1.5 font-semibold text-slate-200 mb-1">
              <span>Chamados no OTRS</span>
              <ExternalLink className="h-3 w-3 text-blue-400" />
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              O OTRS é o sistema oficial de chamados. A Central armazena diagnósticos, comandos e procedimentos técnicos internos.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
