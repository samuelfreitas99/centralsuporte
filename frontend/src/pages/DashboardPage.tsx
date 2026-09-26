import React, { useMemo } from 'react';
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
  Headset,
  BookOpen,
  PlusCircle,
  Wrench,
  Terminal,
  Server,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardPageProps {
  onSelectTab?: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onSelectTab }) => {
  // 1. Critical Alerts Logic
  const criticalTasks = useMemo(() => mockTasks.filter(t => t.priority === 'urgente' && t.status !== 'concluida'), []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-8 pb-8"
    >
      {/* 1. Critical Alerts (Renderização Condicional) */}
      {criticalTasks.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-destructive/20 bg-destructive/10 p-4 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/20 text-destructive">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-destructive">Atenção Crítica Necessária</h3>
              <p className="text-xs text-destructive/80 mt-0.5">
                Você possui {criticalTasks.length} {criticalTasks.length === 1 ? 'tarefa urgente' : 'tarefas urgentes'} para resolver no plantão.
              </p>
            </div>
          </div>
          <Button variant="destructive" size="sm" onClick={() => onSelectTab?.('tasks')} className="shrink-0 h-8 text-xs font-medium">
            Resolver Agora
          </Button>
        </div>
      )}

      {/* Grid Principal */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* 2. O MEU TURNO (Esquerda - 8 colunas) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          <DashboardHeader />
          
          {/* Ações Rápidas Integradas organicamente sob o cabeçalho */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => onSelectTab?.('attendance')}
              className="h-8 gap-1.5 text-xs font-medium shadow-sm"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Novo Atendimento</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectTab?.('commands')}
              className="h-8 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Comandos</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectTab?.('equipment')}
              className="h-8 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Server className="h-3.5 w-3.5" />
              <span>Equipamentos</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectTab?.('maintenances')}
              className="h-8 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>Manutenções</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            <TaskListSection
              initialTasks={mockTasks}
              onNavigateToTasks={() => onSelectTab?.('tasks')}
            />
            <RemindersSection
              reminders={mockReminders}
              onNavigateToReminders={() => onSelectTab?.('tasks')}
            />
          </div>
        </div>

        {/* 3. MÉTRICAS DA EQUIPE (Direita - 4 colunas) */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2">
            <h2 className="font-heading text-lg font-semibold text-foreground">Visão Geral</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              title="Pendentes"
              value={mockDashboardMetrics.pendingTasks}
              subtitle="Tarefas da rotina"
              icon={CheckSquare}
              variant="warning"
              onClick={() => onSelectTab?.('tasks')}
            />
            <MetricCard
              title="Em Curso"
              value={mockDashboardMetrics.inProgressTasks}
              subtitle="Execução agora"
              icon={Clock}
              variant="primary"
              onClick={() => onSelectTab?.('tasks')}
            />
            <MetricCard
              title="Atendimentos"
              value={mockDashboardMetrics.recentAttendances}
              subtitle="Hoje"
              icon={Headset}
              variant="success"
              onClick={() => onSelectTab?.('attendance')}
            />
            <MetricCard
              title="Base"
              value={mockKnowledge.length}
              subtitle="Artigos lidos"
              icon={BookOpen}
              variant="default"
              onClick={() => onSelectTab?.('knowledge')}
            />
          </div>
        </div>
      </div>

      <div className="w-full h-px bg-border/40 my-4"></div>

      {/* 4. CONTEXTO CONTÍNUO / TIMELINE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        <RecentAttendancesSection
          attendances={mockAttendances}
          onNavigateToAttendance={() => onSelectTab?.('attendance')}
        />
        <QuickKnowledgeSection
          articles={mockKnowledge}
          onNavigateToKnowledge={() => onSelectTab?.('knowledge')}
        />
      </div>

      {/* 5. Banner OTRS Reduzido */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground text-center">
        <div className="flex items-center gap-1.5 font-medium text-muted-foreground/80">
          <span>Integração Oficial com OTRS</span>
          <ExternalLink className="h-3 w-3" />
        </div>
        <span className="hidden sm:inline">—</span>
        <span>Abertura, histórico do cliente e encerramento ocorrem exclusivamente no sistema OTRS.</span>
      </div>
    </motion.div>
  );
};
