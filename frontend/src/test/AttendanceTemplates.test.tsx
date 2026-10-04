import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TemplatePicker } from '@/components/attendance/TemplatePicker';
import { EMPTY_FORM, applyTemplate, parseOtrsInput } from '@/components/attendance/attendanceForm';
import { attendanceService } from '@/services/attendanceService';
import type { AttendanceTemplate } from '@/types/attendance';

vi.mock('@/services/attendanceService');

const tpl: AttendanceTemplate = {
  id: 1,
  name: 'Impressora fiscal',
  title: 'Impressora não imprime',
  diagnosis: 'Sem papel',
  solution: 'Trocar bobina',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

describe('Modelos de atendimento', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fills only empty fields', () => {
    const next = applyTemplate({ ...EMPTY_FORM, title: 'PDV 3 sem impressão' }, tpl);
    expect(next.title).toBe('PDV 3 sem impressão');
    expect(next.diagnosis).toBe('Sem papel');
    expect(next.solution).toBe('Trocar bobina');
  });

  it('applies the chosen template', async () => {
    vi.mocked(attendanceService.getTemplates).mockResolvedValue([tpl]);
    const onApply = vi.fn();
    render(<TemplatePicker onApply={onApply} canManage={false} />);
    const select = await screen.findByLabelText('Usar modelo');
    fireEvent.change(select, { target: { value: '1' } });
    await waitFor(() => expect(onApply).toHaveBeenCalledWith(tpl));
  });

  it('explains how to create templates when there are none', async () => {
    vi.mocked(attendanceService.getTemplates).mockResolvedValue([]);
    render(<TemplatePicker onApply={vi.fn()} canManage />);
    expect(await screen.findByText(/Salvar como modelo/)).toBeInTheDocument();
  });
});

describe('parseOtrsInput', () => {
  it('extracts the ticket number from a pasted OTRS link', () => {
    expect(parseOtrsInput('https://otrs/index.pl?Action=AgentTicketZoom;TicketNumber=2026100410001')).toEqual({
      ticket: '2026100410001',
      url: 'https://otrs/index.pl?Action=AgentTicketZoom;TicketNumber=2026100410001',
    });
    expect(parseOtrsInput('https://otrs/index.pl?Action=AgentTicketZoom;TicketID=55').ticket).toBe('');
    expect(parseOtrsInput('12345')).toEqual({ ticket: '12345' });
  });
});
