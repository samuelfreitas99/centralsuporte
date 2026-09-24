import React from 'react';
import { motion } from 'motion/react';
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
import {
  CheckSquare,
  Clock,
  Bell,
  Headset,
  ExternalLink,
  BookOpen,
  Terminal,
  Server,
  PlusCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardPageProps {
  onSelectTab?: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onSelectTab }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* 1. Technical Shift Greeting and Status */}
      <DashboardHeader />

      {/* 2. Quick Actions Bar — Operational Shortcuts */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 rounded-xl border border-border/70 bg-card/60 p-3 backdrop-blur-md">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 shrink-0">
          Ações Rápidas:
        </span>
        <Button
          variant="default"
          size="sm"
          onClick={() => onSelectTab?.('attendance')}
          className="h-8 gap-1.5 text-xs font-medium cursor-pointer shadow-sm"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>Novo Atendimento</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelectTab?.('tasks')}
          className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
        >
          <CheckSquare className="h-3.5 w-3.5 text-primary" />
          <span>Minhas Tarefas</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelectTab?.('commands')}
          className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
        >
          <Terminal className="h-3.5 w-3.5 text-primary" />
          <span>Comandos Rápidos</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelectTab?.('knowledge')}
          className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
        >
          <BookOpen className="h-3.5 w-3.5 text-primary" />
          <span>Base de Conhecimento</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelectTab?.('equipment')}
          className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
        >
          <Server className="h-3.5 w-3.5 text-primary" />
          <span>Parque TI & Lojas</span>
        </Button>
      </div>

      {/* 3. Tactical Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Tarefas Pendentes"
          value={mockDashboardMetrics.pendingTasks}
          subtitle="Atividades da rotina técnica"
          icon={CheckSquare}
          variant="warning"
          onClick={() => onSelectTab?.('tasks')}
        />
        <MetricCard
          title="Em Andamento"
          value={mockDashboardMetrics.inProgressTasks}
          subtitle="Tarefas em execução agora"
          icon={Clock}
          variant="primary"
          onClick={() => onSelectTab?.('tasks')}
        />
        <MetricCard
          title="Lembretes Ativos"
          value={mockDashboardMetrics.todayReminders}
          subtitle="Passagens de turno e alertas"
          icon={Bell}
          variant="default"
          onClick={() => onSelectTab?.('tasks')}
        />
        <MetricCard
          title="Atendimentos Recentes"
          value={mockDashboardMetrics.recentAttendances}
          subtitle="Vinculados a chamados OTRS"
          icon={Headset}
          variant="success"
          onClick={() => onSelectTab?.('attendance')}
        />
      </div>

      {/* 4. Operational Grid Sections */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          <TaskListSection
            initialTasks={mockTasks}
            onNavigateToTasks={() => onSelectTab?.('tasks')}
          />
          <RecentAttendancesSection
            attendances={mockAttendances}
            onNavigateToAttendance={() => onSelectTab?.('attendance')}
          />
        </div>

        {/* Right Column (1 col) */}
        <div className="space-y-6 lg:col-span-1">
          <RemindersSection
            reminders={mockReminders}
            onNavigateToReminders={() => onSelectTab?.('tasks')}
          />
          <QuickKnowledgeSection
            articles={mockKnowledge}
            onNavigateToKnowledge={() => onSelectTab?.('knowledge')}
          />
        </div>
      </div>

      {/* 5. OTRS Boundary Disclaimer Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-border/70 bg-card/60 p-4 text-xs text-muted-foreground backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <span>Integração Oficial com OTRS</span>
            <ExternalLink className="h-3.5 w-3.5 text-primary" />
          </span>
          <span>—</span>
          <span>Abertura, SLA, histórico do cliente e fechamento ocorrem exclusivamente no OTRS.</span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground shrink-0 font-medium">Central Operacional v1.0</span>
      </div>
    </motion.div>
  );
};
