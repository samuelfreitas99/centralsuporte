import type {
  DashboardTask,
  DashboardReminder,
  RecentAttendance,
  QuickKnowledge,
  DashboardMetrics,
} from '@/types/dashboard';

export const mockDashboardMetrics: DashboardMetrics = {
  pendingTasks: 5,
  inProgressTasks: 3,
  todayReminders: 4,
  recentAttendances: 8,
};

export const mockTasks: DashboardTask[] = [
  {
    id: 't-1',
    title: 'Validar link de contingência 4G - Filial 04',
    category: 'Redes',
    priority: 'alta',
    status: 'em_andamento',
    dueTime: '10:30',
  },
  {
    id: 't-2',
    title: 'Substituição de leitor Honeywell PDV 02 - Matriz',
    category: 'Hardware',
    priority: 'urgente',
    status: 'pendente',
    dueTime: '11:00',
  },
  {
    id: 't-3',
    title: 'Checklist diário de abertura de caixa e impressoras fiscais',
    category: 'Rotina',
    priority: 'media',
    status: 'em_andamento',
    dueTime: '11:30',
  },
  {
    id: 't-4',
    title: 'Atualização firmware switch UniFi - Setor Logística',
    category: 'Infraestrutura',
    priority: 'baixa',
    status: 'pendente',
    dueTime: '14:00',
  },
  {
    id: 't-5',
    title: 'Auditoria de permissões de acesso remoto AnyDesk/RustDesk',
    category: 'Segurança',
    priority: 'media',
    status: 'pendente',
    dueTime: '16:00',
  },
];

export const mockReminders: DashboardReminder[] = [
  {
    id: 'r-1',
    text: 'Passagem de turno com técnico da noite às 18:00',
    time: '18:00',
    type: 'turno',
  },
  {
    id: 'r-2',
    text: 'Janela de manutenção programada no switch core às 22:00',
    time: '22:00',
    type: 'sistema',
  },
  {
    id: 'r-3',
    text: 'Acompanhar abertura de chamado de garantia Dell para Servidor 02',
    time: '14:30',
    type: 'alerta',
  },
];

export const mockAttendances: RecentAttendance[] = [
  {
    id: 'at-101',
    otrsTicket: '#20260924001',
    title: 'Falha de comunicação SAT / PDV 03',
    technician: 'admin',
    equipment: 'SAT Bematech RB-2000',
    status: 'Em Diagnóstico',
    updatedAt: 'Há 15 min',
  },
  {
    id: 'at-102',
    otrsTicket: '#20260924002',
    title: 'Lentidão em emissão de NFe - Loja 02',
    technician: 'tecnico_turno',
    equipment: 'Servidor Local Loja 02',
    status: 'Solução Aplicada',
    updatedAt: 'Há 45 min',
  },
  {
    id: 'at-103',
    otrsTicket: '#20260923089',
    title: 'Troca de fita e calibração de balança Toledo Prix 5',
    technician: 'admin',
    equipment: 'Balança Toledo Prix 5',
    status: 'Concluído',
    updatedAt: 'Há 2 horas',
  },
];

export const mockKnowledge: QuickKnowledge[] = [
  {
    id: 'kb-1',
    title: 'Comandos úteis para reinicialização do Spooler e SAT Fiscal',
    category: 'Procedimentos',
    tags: ['SAT', 'Windows', 'Spooler'],
    views: 142,
  },
  {
    id: 'kb-2',
    title: 'Procedimento de contingência para queda de link primário de internet',
    category: 'Redes',
    tags: ['Mikrotik', 'Failover', '4G'],
    views: 98,
  },
  {
    id: 'kb-3',
    title: 'Configuração padrão de pinpad e TEF dedicado na rede local',
    category: 'TEF / Pagamento',
    tags: ['TEF', 'SiTef', 'Pinpad'],
    views: 87,
  },
];
