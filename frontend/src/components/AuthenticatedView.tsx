import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { AppLayout } from './layout/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NAV_ITEMS } from './layout/nav-items';
import { ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Code-splitting via lazy loading para otimização de performance e redução de bundle
const SearchAndReportsPage = lazy(() =>
  import('@/pages/SearchAndReportsPage').then((m) => ({ default: m.SearchAndReportsPage }))
);
const ProjectsPage = lazy(() =>
  import('@/pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage }))
);
const TasksPage = lazy(() =>
  import('@/pages/TasksPage').then((m) => ({ default: m.TasksPage }))
);
const MaintenancePage = lazy(() =>
  import('@/pages/MaintenancePage').then((m) => ({ default: m.MaintenancePage }))
);
const KnowledgePage = lazy(() =>
  import('@/pages/KnowledgePage').then((m) => ({ default: m.KnowledgePage }))
);
const CommandsPage = lazy(() =>
  import('@/pages/CommandsPage').then((m) => ({ default: m.CommandsPage }))
);
const AttendancePage = lazy(() =>
  import('@/pages/AttendancePage').then((m) => ({ default: m.AttendancePage }))
);
const InfrastructurePage = lazy(() =>
  import('@/pages/InfrastructurePage').then((m) => ({ default: m.InfrastructurePage }))
);
const AuditLogsPage = lazy(() =>
  import('@/pages/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage }))
);
const UsersPage = lazy(() =>
  import('@/pages/UsersPage').then((m) => ({ default: m.UsersPage }))
);
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const RolesPage = lazy(() =>
  import('@/pages/RolesPage').then((m) => ({ default: m.RolesPage }))
);

const FilesPage = lazy(() =>
  import('@/pages/FilesPage').then((m) => ({ default: m.FilesPage }))
);

export const AuthenticatedView: React.FC = () => {
  const getHashInfo = () => {
    const hash = window.location.hash.replace('#', '');
    const [tab, query] = hash.split('?');
    const params = new URLSearchParams(query || '');
    const id = params.get('id');
    return {
      tab: tab || 'dashboard',
      profileId: id ? Number(id) : null,
    };
  };

  const [currentTab, setCurrentTab] = useState(() => getHashInfo().tab);
  const [profileUserId, setProfileUserId] = useState<number | null>(() => getHashInfo().profileId);

  useEffect(() => {
    const handlePopState = () => {
      const { tab, profileId } = getHashInfo();
      setCurrentTab(tab);
      setProfileUserId(profileId);
    };

    window.addEventListener('popstate', handlePopState);
    
    // Set initial hash if empty
    if (!window.location.hash) {
      window.history.replaceState(null, '', '#dashboard');
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectTab = useCallback((tabWithQuery: string) => {
    const [tab, query] = tabWithQuery.split('?');
    const params = new URLSearchParams(query || '');
    const id = params.get('id');
    setCurrentTab(tab);
    setProfileUserId(id ? Number(id) : null);
    window.history.pushState(null, '', `#${tabWithQuery}`);
    window.dispatchEvent(new Event('popstate'));
  }, []);

  const activeNavItem = NAV_ITEMS.find((item) => item.id === currentTab);

  return (
    <AppLayout currentTab={currentTab} onSelectTab={handleSelectTab}>
      <Suspense fallback={<PageSkeleton />}>
        {currentTab === 'dashboard' ? (
          <DashboardPage onSelectTab={handleSelectTab} />
        ) : currentTab === 'search-reports' ? (
          <SearchAndReportsPage onSelectTab={handleSelectTab} />
        ) : currentTab === 'projects' ? (
          <ProjectsPage onSelectTab={handleSelectTab} />
        ) : currentTab === 'tasks' ? (
          <TasksPage />
        ) : currentTab === 'maintenances' ? (
          <MaintenancePage />
        ) : currentTab === 'knowledge' ? (
          <KnowledgePage />
        ) : currentTab === 'commands' ? (
          <CommandsPage />
        ) : currentTab === 'attendance' ? (
          <AttendancePage />
        ) : currentTab === 'equipment' ? (
          <InfrastructurePage />
        ) : currentTab === 'files' ? (
          <FilesPage />
        ) : currentTab === 'audit' ? (
          <AuditLogsPage />
        ) : currentTab === 'users' ? (
          <UsersPage
            onSelectTab={handleSelectTab}
            onOpenProfile={(id) => handleSelectTab(`profile?id=${id}`)}
          />
        ) : currentTab === 'profile' ? (
          <ProfilePage
            userId={profileUserId}
            onBack={() => handleSelectTab('users')}
            onSelectTab={handleSelectTab}
          />
        ) : currentTab === 'roles' ? (
          <RolesPage />
        ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectTab('dashboard')}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar ao Dashboard</span>
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-foreground font-heading">{activeNavItem?.label}</span>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-blue-400" />
                <span>Roadmap Futuro</span>
              </Badge>
            </div>
          </div>

          <Card className="border-border/80 bg-card/75 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="font-heading">{activeNavItem?.label}</CardTitle>
              <CardDescription>
                Este módulo está programado no Roadmap e será integrado sequencialmente nas próximas fases.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                A Central Operacional do Suporte Técnico está sendo implementada de forma incremental e robusta, garantindo qualidade, ergonomia de uso e alinhamento com a equipe de TI.
              </p>
              <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-4">
                <p className="font-semibold text-slate-200 mb-1">Diretriz Arquitetural:</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  O OTRS permanece como fonte oficial para abertura, comunicação e fechamento de chamados. A Central armazena diagnósticos, inventário, procedimentos operacionais e comandos para uso imediato dos analistas de suporte.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </Suspense>
    </AppLayout>
  );
};
