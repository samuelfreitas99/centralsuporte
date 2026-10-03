import React from 'react';
import { Shield, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { UsersPage } from '@/pages/UsersPage';
import { RolesPage } from '@/pages/RolesPage';

type AccessTab = 'users' | 'roles';

interface AccessPageProps {
  tab: AccessTab;
  navigate: (target: string) => void;
}

/** Usuários e Perfis/Permissões em uma única área administrativa (`#users` e `#roles`). */
export const AccessPage: React.FC<AccessPageProps> = ({ tab, navigate }) => {
  const { hasPermission } = useAuth();
  const tabs = [
    { id: 'users' as const, label: 'Usuários', icon: Users, visible: hasPermission('users:read') },
    { id: 'roles' as const, label: 'Perfis e permissões', icon: Shield, visible: hasPermission('roles:read') },
  ].filter((t) => t.visible);

  return (
    <div className="space-y-5">
      {tabs.length > 1 && (
        <div role="tablist" aria-label="Usuários e permissões" className="inline-flex gap-1 rounded-xl border border-border/70 bg-muted/40 p-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => navigate(t.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                  active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {tab === 'users' ? (
        <UsersPage onSelectTab={navigate} onOpenProfile={(id) => navigate(`profile?id=${id}`)} />
      ) : (
        <RolesPage />
      )}
    </div>
  );
};
