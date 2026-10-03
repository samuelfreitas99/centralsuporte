import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { AppLayout } from './layout/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { NAV_ALIASES } from './layout/nav-items';

// Code-splitting: cada módulo é carregado sob demanda.
const ReportsPage = lazy(() => import('@/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const TasksPage = lazy(() => import('@/pages/TasksPage').then((m) => ({ default: m.TasksPage })));
const MaintenancePage = lazy(() => import('@/pages/MaintenancePage').then((m) => ({ default: m.MaintenancePage })));
const KnowledgePage = lazy(() => import('@/pages/KnowledgePage').then((m) => ({ default: m.KnowledgePage })));
const CommandsPage = lazy(() => import('@/pages/CommandsPage').then((m) => ({ default: m.CommandsPage })));
const AttendancePage = lazy(() => import('@/pages/AttendancePage').then((m) => ({ default: m.AttendancePage })));
const InfrastructurePage = lazy(() =>
  import('@/pages/InfrastructurePage').then((m) => ({ default: m.InfrastructurePage }))
);
const AuditLogsPage = lazy(() => import('@/pages/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage })));
const UsersPage = lazy(() => import('@/pages/UsersPage').then((m) => ({ default: m.UsersPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const RolesPage = lazy(() => import('@/pages/RolesPage').then((m) => ({ default: m.RolesPage })));
const FilesPage = lazy(() => import('@/pages/files/FilesPage').then((m) => ({ default: m.FilesPage })));

interface RouteContext {
  navigate: (target: string) => void;
  profileUserId: number | null;
}

/**
 * Tabela de rotas: id do hash (`#id`) -> página.
 * Para adicionar um módulo: crie a página, registre aqui e em `layout/nav-items.ts`.
 */
const ROUTES: Record<string, (ctx: RouteContext) => React.ReactNode> = {
  dashboard: ({ navigate }) => <DashboardPage onSelectTab={navigate} />,
  attendance: () => <AttendancePage />,
  tasks: () => <TasksPage />,
  maintenances: () => <MaintenancePage />,
  projects: ({ navigate }) => <ProjectsPage onSelectTab={navigate} />,
  knowledge: () => <KnowledgePage />,
  commands: () => <CommandsPage />,
  files: () => <FilesPage />,
  equipment: () => <InfrastructurePage />,
  reports: () => <ReportsPage />,
  users: ({ navigate }) => (
    <UsersPage onSelectTab={navigate} onOpenProfile={(id) => navigate(`profile?id=${id}`)} />
  ),
  roles: () => <RolesPage />,
  audit: () => <AuditLogsPage />,
  profile: ({ navigate, profileUserId }) => (
    <ProfilePage userId={profileUserId} onBack={() => navigate('users')} onSelectTab={navigate} />
  ),
};

const parseHash = () => {
  const [rawTab, query] = window.location.hash.replace('#', '').split('?');
  const tab = NAV_ALIASES[rawTab] ?? rawTab;
  const id = new URLSearchParams(query || '').get('id');
  return {
    tab: ROUTES[tab] ? tab : 'dashboard',
    profileUserId: id ? Number(id) : null,
  };
};

export const AuthenticatedView: React.FC = () => {
  const [route, setRoute] = useState(parseHash);

  useEffect(() => {
    const handleLocationChange = () => setRoute(parseHash());
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    if (!window.location.hash) {
      window.history.replaceState(null, '', '#dashboard');
    }

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  /** Navega para `modulo` ou `modulo?id=123`. As páginas leem o `id` do hash para abrir o item. */
  const navigate = useCallback((target: string) => {
    window.history.pushState(null, '', `#${target}`);
    // Avisa a própria view e as páginas já montadas (que escutam popstate para abrir o item).
    window.dispatchEvent(new Event('popstate'));
  }, []);

  return (
    <AppLayout currentTab={route.tab} onSelectTab={navigate}>
      <Suspense fallback={<PageSkeleton />}>{ROUTES[route.tab]({ navigate, profileUserId: route.profileUserId })}</Suspense>
    </AppLayout>
  );
};
