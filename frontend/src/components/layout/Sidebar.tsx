import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { X, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/Avatar';
import { NAV_ITEMS, NAV_SECTIONS } from './nav-items';

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

  const renderNavGroup = (title: string, items: typeof filteredItems) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1">
        {title && (
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
            {title}
          </p>
        )}
        <div className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id || (item.activeFor?.includes(currentTab) ?? false);
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
            <span className="font-semibold text-foreground font-heading text-sm">Menu</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar menu" className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* User Info Capsule (Mobile only) */}
        {user && (
          <button
            type="button"
            onClick={() => {
              onSelectTab('profile');
              onClose();
            }}
            className="flex items-center gap-2.5 px-4 py-3 border-b border-border/60 lg:hidden bg-muted/20 hover:bg-muted/40 transition-colors text-left cursor-pointer w-full"
            title="Ver meu perfil"
          >
            <Avatar
              src={user.avatar_url}
              name={user.display_name || user.full_name || user.username}
              size="sm"
              status={user.is_active ? 'active' : 'inactive'}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {user.display_name || user.username}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-primary" />
                <span>
                  {user.roles && user.roles.length > 0
                    ? user.roles[0].name
                    : user.role?.name || 'Geral'}
                </span>
              </div>
            </div>
          </button>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 space-y-5 overflow-y-auto p-3" aria-label="Menu principal">
          {NAV_SECTIONS.map((section) => (
            <React.Fragment key={section.id}>
              {renderNavGroup(section.title, filteredItems.filter((i) => i.section === section.id))}
            </React.Fragment>
          ))}
        </nav>

        {/* Lembrete discreto da fronteira com o OTRS (única menção fixa na interface) */}
        <p className="border-t border-border/60 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground/70">
          Chamados oficiais ficam no <span className="font-semibold text-muted-foreground">OTRS</span>. Aqui registramos o conhecimento técnico interno.
        </p>
      </aside>
    </>
  );
};
