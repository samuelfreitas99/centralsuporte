import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { X, ExternalLink } from 'lucide-react';
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
  const { hasPermission } = useAuth();

  const filteredItems = NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-300 lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile Header / Close Button */}
        <div className="flex h-16 items-center justify-between border-b border-border px-6 lg:hidden">
          <span className="font-semibold text-foreground">Menu de Navegação</span>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto p-4">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Módulos Operacionais
          </p>
          {filteredItems.map((item) => {
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
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left cursor-pointer',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? 'text-primary-foreground' : 'text-muted-foreground')} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* OTRS Complementary Warning Card */}
        <div className="border-t border-border p-4">
          <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
              <span>Chamados no OTRS</span>
              <ExternalLink className="h-3 w-3 text-primary" />
            </div>
            <p className="leading-relaxed">
              O OTRS é o sistema oficial de chamados. A Central é a base técnica de operação e procedimentos.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
