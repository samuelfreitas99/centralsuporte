/**
 * Rótulos e cores de status/prioridade de TODA a Central, em um só lugar.
 * Use via <StatusBadge domain="..." status="..."/> e <PriorityBadge/>; não crie switch próprio na tela.
 */
export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
export type StatusDomain = 'task' | 'attendance' | 'maintenance' | 'project' | 'equipment';

interface StatusMeta {
  label: string;
  variant: BadgeVariant;
}

export const STATUS_META: Record<StatusDomain, Record<string, StatusMeta>> = {
  task: {
    pendente: { label: 'Pendente', variant: 'outline' },
    em_andamento: { label: 'Em andamento', variant: 'warning' },
    concluida: { label: 'Concluída', variant: 'success' },
    cancelada: { label: 'Cancelada', variant: 'secondary' },
  },
  attendance: {
    em_andamento: { label: 'Em andamento', variant: 'warning' },
    resolvido: { label: 'Resolvido', variant: 'success' },
    cancelado: { label: 'Cancelado', variant: 'secondary' },
  },
  maintenance: {
    agendada: { label: 'Agendada', variant: 'info' },
    em_andamento: { label: 'Em andamento', variant: 'warning' },
    concluida: { label: 'Concluída', variant: 'success' },
    cancelada: { label: 'Cancelada', variant: 'secondary' },
  },
  project: {
    planejado: { label: 'Planejado', variant: 'outline' },
    em_andamento: { label: 'Em andamento', variant: 'info' },
    pausado: { label: 'Pausado', variant: 'warning' },
    concluido: { label: 'Concluído', variant: 'success' },
    cancelado: { label: 'Cancelado', variant: 'secondary' },
  },
  equipment: {
    ativo: { label: 'Ativo', variant: 'success' },
    em_manutencao: { label: 'Em manutenção', variant: 'warning' },
    reserva: { label: 'Reserva', variant: 'info' },
    descartado: { label: 'Descartado', variant: 'secondary' },
  },
};

export const PRIORITY_META: Record<string, StatusMeta> = {
  baixa: { label: 'Baixa', variant: 'secondary' },
  media: { label: 'Média', variant: 'default' },
  alta: { label: 'Alta', variant: 'warning' },
  urgente: { label: 'Urgente', variant: 'destructive' },
};

export const statusMeta = (domain: StatusDomain, status: string): StatusMeta =>
  STATUS_META[domain][status] ?? { label: status, variant: 'outline' };

export const priorityMeta = (priority: string): StatusMeta =>
  PRIORITY_META[priority] ?? { label: priority, variant: 'outline' };

/** Opções de filtro por status de um domínio (para FilterSelect). */
export const statusOptions = (domain: StatusDomain) =>
  Object.entries(STATUS_META[domain]).map(([value, meta]) => ({ value, label: meta.label }));

export const priorityOptions = () =>
  Object.entries(PRIORITY_META).map(([value, meta]) => ({ value, label: meta.label }));
