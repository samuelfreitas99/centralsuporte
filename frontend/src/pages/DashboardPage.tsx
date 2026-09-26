import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { TaskListSection } from '@/components/dashboard/TaskListSection';
import { RecentAttendancesSection } from '@/components/dashboard/RecentAttendancesSection';
import { QuickKnowledgeSection } from '@/components/dashboard/QuickKnowledgeSection';
import { RemindersSection } from '@/components/dashboard/RemindersSection';

import { organizationService } from '@/services/organizationService';
import { attendanceService } from '@/services/attendanceService';
import { knowledgeService } from '@/services/knowledgeService';

import type { Task, Reminder } from '@/types/tasks';
import type { AttendanceItem } from '@/types/attendance';
import type { KnowledgeArticle } from '@/types/knowledge';

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Load data concurrently
        const [tasksData, remindersData, attendancesData, articlesData] = await Promise.all([
          organizationService.getTasks(), // without assigned_to_me for now, to get all
          organizationService.getReminders(),
          attendanceService.getAttendances(),
          knowledgeService.getArticles(),
        ]);
        
        setTasks(tasksData);
        setReminders(remindersData);
        setAttendances(attendancesData);
        setArticles(articlesData);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const criticalTasks = useMemo(() => tasks.filter(t => t.priority === 'urgente' && t.status !== 'concluida'), [tasks]);

  const metrics = useMemo(() => {
    return {
      pendingTasks: tasks.filter(t => t.status === 'pendente').length,
      inProgressTasks: tasks.filter(t => t.status === 'em_andamento').length,
      recentAttendances: attendances.length,
      knowledgeBase: articles.length,
    };
  }, [tasks, attendances, articles]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-8 pb-8"
    >
      {/* 1. Critical Alerts (Renderização Condicional) */}
      {criticalTasks.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-destructive"></div>
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/20 text-destructive">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-destructive">Atenção Crítica Necessária</h3>
              <p className="text-xs text-destructive/90 mt-0.5 font-medium">
                Você possui {criticalTasks.length} {criticalTasks.length === 1 ? 'tarefa urgente' : 'tarefas urgentes'} para resolver no plantão.
              </p>
            </div>
          </div>
          <Button variant="destructive" size="sm" onClick={() => onSelectTab?.('tasks')} className="shrink-0 h-8 text-xs font-bold shadow-sm">
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
          <div className="flex flex-wrap items-center gap-2 mb-2 bg-card p-2 rounded-xl border border-border/60 shadow-xs">
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
              variant="ghost"
              size="sm"
              onClick={() => onSelectTab?.('commands')}
              className="h-8 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Comandos</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectTab?.('equipment')}
              className="h-8 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              <Server className="h-3.5 w-3.5" />
              <span>Equipamentos</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectTab?.('maintenances')}
              className="h-8 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>Manutenções</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            <TaskListSection
              tasks={tasks.slice(0, 5)}
              loading={loading}
              onNavigateToTasks={() => onSelectTab?.('tasks')}
            />
            <RemindersSection
              reminders={reminders.slice(0, 5)}
              loading={loading}
              onNavigateToReminders={() => onSelectTab?.('tasks')}
            />
          </div>
        </div>

        {/* 3. MÉTRICAS DA EQUIPE (Direita - 4 colunas) */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <h2 className="font-heading text-lg font-bold text-foreground">Visão Geral</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <MetricCard
              title="Pendentes"
              value={metrics.pendingTasks}
              subtitle="Tarefas da rotina"
              icon={CheckSquare}
              variant="warning"
              onClick={() => onSelectTab?.('tasks')}
            />
            <MetricCard
              title="Em Curso"
              value={metrics.inProgressTasks}
              subtitle="Execução agora"
              icon={Clock}
              variant="primary"
              onClick={() => onSelectTab?.('tasks')}
            />
            <MetricCard
              title="Atendimentos"
              value={metrics.recentAttendances}
              subtitle="Total hoje"
              icon={Headset}
              variant="success"
              onClick={() => onSelectTab?.('attendance')}
            />
            <MetricCard
              title="Base"
              value={metrics.knowledgeBase}
              subtitle="Artigos disponíveis"
              icon={BookOpen}
              variant="default"
              onClick={() => onSelectTab?.('knowledge')}
            />
          </div>
        </div>
      </div>

      <div className="w-full h-px bg-border/60 my-6 shadow-xs"></div>

      {/* 4. CONTEXTO CONTÍNUO / TIMELINE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        <RecentAttendancesSection
          attendances={attendances.slice(0, 5)}
          loading={loading}
          onNavigateToAttendance={(id?: number) => onSelectTab?.(id ? `attendance?id=${id}` : 'attendance')}
        />
        <QuickKnowledgeSection
          articles={articles.slice(0, 5)}
          loading={loading}
          onNavigateToKnowledge={(id?: number) => onSelectTab?.(id ? `knowledge?id=${id}` : 'knowledge')}
        />
      </div>

      {/* 5. Banner OTRS Reduzido */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-2 rounded-xl bg-card border border-border/50 p-4 text-xs text-muted-foreground shadow-sm">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <ExternalLink className="h-4 w-4 text-primary" />
          <span>Integração Oficial com OTRS</span>
        </div>
        <span className="hidden sm:inline text-border">—</span>
        <span className="font-medium text-center">Abertura, histórico do cliente e encerramento ocorrem exclusivamente no sistema OTRS.</span>
      </div>
    </motion.div>
  );
};
