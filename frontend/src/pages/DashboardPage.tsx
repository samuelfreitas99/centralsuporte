import React from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { TaskListSection } from '@/components/dashboard/TaskListSection';
import { RecentAttendancesSection } from '@/components/dashboard/RecentAttendancesSection';
import { QuickKnowledgeSection } from '@/components/dashboard/QuickKnowledgeSection';
import { RemindersSection } from '@/components/dashboard/RemindersSection';
import {
  mockDashboardMetrics,
  mockTasks,
  mockReminders,
  mockAttendances,
  mockKnowledge,
} from '@/services/dashboardMock';
import { CheckSquare, Clock, Bell, Headset, ExternalLink } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 1. Technical Shift Greeting and Status */}
      <DashboardHeader />

      {/* 2. Tactical Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Tarefas Pendentes"
          value={mockDashboardMetrics.pendingTasks}
          subtitle="Atividades da rotina técnica"
          icon={CheckSquare}
          variant="warning"
        />
        <MetricCard
          title="Em Andamento"
          value={mockDashboardMetrics.inProgressTasks}
          subtitle="Tarefas em execução agora"
          icon={Clock}
          variant="primary"
        />
        <MetricCard
          title="Lembretes Ativos"
          value={mockDashboardMetrics.todayReminders}
          subtitle="Passagens de turno e alertas"
          icon={Bell}
          variant="default"
        />
        <MetricCard
          title="Atendimentos Recentes"
          value={mockDashboardMetrics.recentAttendances}
          subtitle="Vinculados a chamados OTRS"
          icon={Headset}
          variant="success"
        />
      </div>

      {/* 3. Operational Grid Sections */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          <TaskListSection initialTasks={mockTasks} />
          <RecentAttendancesSection attendances={mockAttendances} />
        </div>

        {/* Right Column (1 col) */}
        <div className="space-y-6 lg:col-span-1">
          <RemindersSection reminders={mockReminders} />
          <QuickKnowledgeSection articles={mockKnowledge} />
        </div>
      </div>

      {/* 4. OTRS Boundary Disclaimer Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-border/80 bg-muted/30 p-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <span>Integração Oficial com OTRS</span>
            <ExternalLink className="h-3.5 w-3.5 text-primary" />
          </span>
          <span>—</span>
          <span>Abertura, SLA, histórico do cliente e fechamento ocorrem exclusivamente no OTRS.</span>
        </div>
        <span className="font-mono text-[11px] text-primary shrink-0">Central Operacional v1.0</span>
      </div>
    </div>
  );
};
