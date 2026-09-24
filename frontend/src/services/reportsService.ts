import { request, getApiBase } from './api';
import type { OperationalSummaryReport } from '@/types/reports';

export const reportsService = {
  getSummary: (days: number = 30): Promise<OperationalSummaryReport> => {
    return request<OperationalSummaryReport>(`/reports/summary?days=${days}`);
  },

  downloadCsvExport: async (days: number = 30): Promise<void> => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${getApiBase()}/reports/export?days=${days}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error('Falha ao baixar exportação de relatórios em CSV.');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_operacional_${days}d.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
