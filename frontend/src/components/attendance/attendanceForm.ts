import type { AttendanceCreateInput, AttendanceItem, AttendanceTemplate } from '@/types/attendance';

/** Valores iniciais do formulário de atendimento. */
export const EMPTY_FORM: AttendanceCreateInput = {
  title: '',
  otrs_ticket: '',
  otrs_url: '',
  requester_name: '',
  status: 'em_andamento',
  equipment_id: null,
  equipment_name: '',
  store_department: '',
  problem_description: '',
  symptoms: '',
  diagnosis: '',
  cause: '',
  solution: '',
  commands_used: '',
  internal_notes: '',
  project_id: undefined,
};

export const attendanceToForm = (att: AttendanceItem): AttendanceCreateInput => ({
  title: att.title,
  otrs_ticket: att.otrs_ticket || '',
  otrs_url: att.otrs_url || '',
  requester_name: att.requester_name || '',
  status: att.status || 'em_andamento',
  equipment_id: att.equipment_id ?? null,
  equipment_name: att.equipment_name || '',
  store_department: att.store_department || '',
  problem_description: att.problem_description || '',
  symptoms: att.symptoms || '',
  diagnosis: att.diagnosis || '',
  cause: att.cause || '',
  solution: att.solution || '',
  commands_used: att.commands_used || '',
  internal_notes: att.internal_notes || '',
  project_id: att.project_id || undefined,
});

/** Extrai o número do chamado de um link do OTRS colado no campo (TicketNumber=...). */
export const parseOtrsInput = (value: string): { ticket: string; url?: string } => {
  const text = value.trim();
  if (!/^https?:\/\//i.test(text)) return { ticket: value };
  const match = text.match(/TicketNumber=(\d+)/i);
  return { ticket: match ? match[1] : '', url: text };
};

const TEMPLATE_FIELDS = ['title', 'problem_description', 'symptoms', 'diagnosis', 'cause', 'solution', 'commands_used'] as const;

/** Preenche com o modelo apenas os campos ainda vazios (não apaga o que o técnico já digitou). */
export const applyTemplate = (form: AttendanceCreateInput, tpl: AttendanceTemplate): AttendanceCreateInput => {
  const next = { ...form };
  for (const field of TEMPLATE_FIELDS) {
    if (!String(next[field] ?? '').trim() && tpl[field]) next[field] = tpl[field] as string;
  }
  return next;
};
