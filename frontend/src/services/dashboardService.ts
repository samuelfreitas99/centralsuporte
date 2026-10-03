import { request } from './api';
import type { DashboardSummary } from '@/types/dashboard';

export const dashboardService = {
  /** Contagens reais do Início; envia o fuso do navegador para o backend calcular "hoje". */
  getSummary: (): Promise<DashboardSummary> =>
    request<DashboardSummary>(`/dashboard/summary?tz_offset=${new Date().getTimezoneOffset()}`),
};
