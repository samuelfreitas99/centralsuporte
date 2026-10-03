/**
 * Formatação de datas da Central (sempre pt-BR, sem segundos). Use estas funções em vez de
 * `toLocaleString` direto — assim toda a interface mostra datas do mesmo jeito.
 */
type DateInput = string | number | Date | null | undefined;

const toDate = (value: DateInput): Date | null => {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** 03/10/2026 */
export const formatDate = (value: DateInput, fallback = '—') => {
  const d = toDate(value);
  return d ? dateFmt.format(d) : fallback;
};

/** 14:30 */
export const formatTime = (value: DateInput, fallback = '—') => {
  const d = toDate(value);
  return d ? timeFmt.format(d) : fallback;
};

/** 03/10/2026 14:30 */
export const formatDateTime = (value: DateInput, fallback = '—') => {
  const d = toDate(value);
  return d ? `${dateFmt.format(d)} ${timeFmt.format(d)}` : fallback;
};

/** "hoje 14:30", "ontem 09:10", "amanhã 08:00" ou a data completa. */
export const formatRelative = (value: DateInput, fallback = '—') => {
  const d = toDate(value);
  if (!d) return fallback;
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(d) - startOf(new Date())) / 86_400_000);
  const labels: Record<number, string> = { [-1]: 'ontem', 0: 'hoje', 1: 'amanhã' };
  return diffDays in labels ? `${labels[diffDays]} ${timeFmt.format(d)}` : formatDateTime(d);
};
