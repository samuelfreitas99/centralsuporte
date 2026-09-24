import React, { useState, Suspense, lazy } from 'react';
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

export const AuthenticatedView: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('dashboard');

  const activeNavItem = NAV_ITEMS.find((item) => item.id === currentTab);

  return (
    <AppLayout currentTab={currentTab} onSelectTab={setCurrentTab}>
      <Suspense fallback={<PageSkeleton />}>
        {currentTab === 'dashboard' ? (
          <DashboardPage onSelectTab={setCurrentTab} />
        ) : currentTab === 'search-reports' ? (
          <SearchAndReportsPage onSelectTab={setCurrentTab} />
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
        ) : currentTab === 'audit' ? (
          <AuditLogsPage />
        ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentTab('dashboard')}
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
