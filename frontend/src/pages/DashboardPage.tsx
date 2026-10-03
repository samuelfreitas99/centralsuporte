import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  CheckSquare,
  Headset,
  KeyRound,
  Package,
  PlusCircle,
  Search,
  Wrench,
} from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { TaskListSection } from '@/components/dashboard/TaskListSection';
import { RecentAttendancesSection } from '@/components/dashboard/RecentAttendancesSection';
import { QuickKnowledgeSection } from '@/components/dashboard/QuickKnowledgeSection';
import { RemindersSection } from '@/components/dashboard/RemindersSection';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { dashboardService } from '@/services/dashboardService';
import { organizationService } from '@/services/organizationService';
import { attendanceService } from '@/services/attendanceService';
import { knowledgeService } from '@/services/knowledgeService';
import type { DashboardSummary } from '@/types/dashboard';
import type { Task, Reminder } from '@/types/tasks';
import type { AttendanceItem } from '@/types/attendance';
import type { KnowledgeArticle } from '@/types/knowledge';

interface DashboardPageProps {
  onSelectTab?: (tab: string) => void;
}

interface ShiftAlert {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  target: string;
  tone: 'danger' | 'warning';
}

/** Alertas de início de turno montados a partir do resumo (só aparecem quando há algo a fazer). */
const buildAlerts = (s: DashboardSummary): ShiftAlert[] => {
  const alerts: ShiftAlert[] = [];
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  if (s.tasks?.overdue) {
    alerts.push({ key: 'overdue', icon: AlertTriangle, tone: 'danger', target: 'tasks', text: `${plural(s.tasks.overdue, 'tarefa atrasada', 'tarefas atrasadas')}` });
  }
  if (s.maintenances?.overdue) {
    alerts.push({ key: 'maint-overdue', icon: Wrench, tone: 'danger', target: 'maintenances', text: `${plural(s.maintenances.overdue, 'manutenção agendada', 'manutenções agendadas')} com data vencida` });
  }
  if (s.maintenances?.today) {
    alerts.push({ key: 'maint-today', icon: CalendarClock, tone: 'warning', target: 'maintenances', text: `${plural(s.maintenances.today, 'manutenção', 'manutenções')} para hoje` });
  }
  if (s.low_stock_total) {
    const names = (s.low_stock ?? []).slice(0, 2).map((i) => i.name).join(', ');
    alerts.push({ key: 'stock', icon: Package, tone: 'warning', target: 'equipment', text: `${plural(s.low_stock_total, 'item', 'itens')} com estoque baixo${names ? ` (${names}${s.low_stock_total > 2 ? '…' : ''})` : ''}` });
  }
  if (s.expiring_licenses_total) {
    const next = s.expiring_licenses?.[0];
    alerts.push({ key: 'licenses', icon: KeyRound, tone: 'warning', target: 'equipment', text: `${plural(s.expiring_licenses_total, 'licença vence', 'licenças vencem')} em até 30 dias${next ? ` (próxima: ${next.name}, ${next.days_left < 0 ? 'vencida' : `${next.days_left} dias`})` : ''}` });
  }
  return alerts;
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ onSelectTab }) => {
  const { hasPermission } = useAuth();
  const go = (target: string) => onSelectTab?.(target);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // Cada bloco falha de forma independente (ex.: sem permissão para um módulo).
      const [summaryData, tasksData, remindersData, attendancesData, articlesData] = await Promise.all([
        dashboardService.getSummary().catch(() => null),
        organizationService.getTasks({ assigned_to_me: true, limit: 20 }).catch(() => null),
        organizationService.getReminders('pendente', 'manual').catch(() => [] as Reminder[]),
        attendanceService.getAttendances().catch(() => [] as AttendanceItem[]),
        knowledgeService.getArticles().catch(() => [] as KnowledgeArticle[]),
      ]);
      if (cancelled) return;
      setSummary(summaryData);
      setMyTasks(
        ((tasksData?.items ?? []) as Task[]).filter((t) => t.status === 'pendente' || t.status === 'em_andamento')
      );
      setReminders(remindersData);
      setAttendances(attendancesData);
      setArticles(articlesData);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const alerts = summary ? buildAlerts(summary) : [];
  const metric = (n: number | undefined) => (n === undefined ? '—' : n);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-8 pb-8"
    >
      <DashboardHeader />

      {/* Ações rápidas */}
      <div className="flex flex-wrap items-center gap-2">
        {hasPermission('attendance:write') && (
          <Button size="sm" onClick={() => go('attendance?new=true')} className="h-8 gap-1.5 text-xs font-medium shadow-sm">
            <PlusCircle className="h-3.5 w-3.5" />
            Novo atendimento
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
          className="h-8 gap-1.5 text-xs font-medium"
        >
          <Search className="h-3.5 w-3.5" />
          Buscar (Ctrl+K)
        </Button>
      </div>

      {/* Alertas de início de turno */}
      {alerts.length > 0 && (
        <section aria-label="Alertas do turno" className="grid gap-2 sm:grid-cols-2">
          {alerts.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => go(a.target)}
                className={
                  a.tone === 'danger'
                    ? 'flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-left text-xs font-medium text-destructive hover:bg-destructive/15 cursor-pointer'
                    : 'flex items-center gap-2.5 rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-left text-xs font-medium text-foreground hover:bg-warning/15 cursor-pointer'
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{a.text}</span>
              </button>
            );
          })}
        </section>
      )}

      {/* Números do turno (contagens reais do servidor) */}
      <section aria-label="Resumo" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary?.tasks && (
          <MetricCard
            title="Minhas tarefas"
            value={metric(summary.tasks.assigned_to_me)}
            subtitle={`${summary.tasks.pending + summary.tasks.in_progress} abertas na equipe`}
            icon={CheckSquare}
            variant="primary"
            onClick={() => go('tasks')}
          />
        )}
        {summary?.tasks && (
          <MetricCard
            title="Urgentes"
            value={metric(summary.tasks.urgent)}
            subtitle={`${summary.tasks.overdue} atrasadas`}
            icon={AlertTriangle}
            variant="warning"
            onClick={() => go('tasks?priority=urgente')}
          />
        )}
        {summary?.attendances && (
          <MetricCard
            title="Atendimentos"
            value={metric(summary.attendances.open)}
            subtitle={`em andamento · ${summary.attendances.today} hoje`}
            icon={Headset}
            variant="success"
            onClick={() => go('attendance')}
          />
        )}
        {summary?.maintenances ? (
          <MetricCard
            title="Manutenções"
            value={metric(summary.maintenances.today)}
            subtitle={`hoje · ${summary.maintenances.next_7_days} nos próximos 7 dias`}
            icon={Wrench}
            onClick={() => go('maintenances')}
          />
        ) : (
          summary?.knowledge_published != null && (
            <MetricCard
              title="Base"
              value={summary.knowledge_published}
              subtitle="artigos publicados"
              icon={BookOpen}
              onClick={() => go('knowledge')}
            />
          )
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <TaskListSection tasks={myTasks.slice(0, 5)} loading={loading} onNavigateToTasks={() => go('tasks')} />
        <RemindersSection reminders={reminders.slice(0, 5)} loading={loading} onNavigateToReminders={() => go('tasks')} />
        <RecentAttendancesSection
          attendances={attendances.slice(0, 5)}
          loading={loading}
          onNavigateToAttendance={(id?: number) => go(id ? `attendance?id=${id}` : 'attendance')}
        />
        <QuickKnowledgeSection
          articles={articles.slice(0, 5)}
          loading={loading}
          onNavigateToKnowledge={(id?: number) => go(id ? `knowledge?id=${id}` : 'knowledge')}
        />
      </div>
    </motion.div>
  );
};
