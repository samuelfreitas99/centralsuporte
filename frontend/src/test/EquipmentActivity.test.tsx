import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EquipmentActivity } from '@/components/infrastructure/EquipmentActivity';
import { attendanceService } from '@/services/attendanceService';
import { maintenanceService } from '@/services/maintenanceService';
import type { AttendanceItem } from '@/types/attendance';
import type { MaintenanceRecord } from '@/types/maintenance';

vi.mock('@/services/attendanceService');
vi.mock('@/services/maintenanceService');

describe('EquipmentActivity (ficha do equipamento)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = '#equipment?id=7';
    vi.mocked(attendanceService.getAttendances).mockResolvedValue([
      { id: 11, title: 'PDV sem rede', status: 'resolvido', otrs_ticket: '2026100100001', created_at: '2026-10-01T10:00:00Z' } as AttendanceItem,
    ]);
    vi.mocked(maintenanceService.getMaintenances).mockResolvedValue([
      { id: 21, title: 'Limpeza preventiva', status: 'concluida', created_at: '2026-09-01T10:00:00Z', performed_date: '2026-10-02T10:00:00Z' } as MaintenanceRecord,
    ]);
  });

  it('lists attendances and maintenances of the equipment, newest first', async () => {
    render(<EquipmentActivity equipmentId={7} canRegisterAttendance />);

    expect(await screen.findByText('Limpeza preventiva')).toBeInTheDocument();
    expect(attendanceService.getAttendances).toHaveBeenCalledWith({ equipment_id: 7 });
    expect(maintenanceService.getMaintenances).toHaveBeenCalledWith({ equipment_id: 7 });

    const titles = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(titles[0]).toContain('Limpeza preventiva');
    expect(titles[1]).toContain('PDV sem rede');
    expect(titles[1]).toContain('OTRS 2026100100001');
  });

  it('opens the original record and pre-fills a new attendance', async () => {
    render(<EquipmentActivity equipmentId={7} canRegisterAttendance />);

    fireEvent.click(await screen.findByText('PDV sem rede'));
    expect(window.location.hash).toBe('#attendance?id=11');

    fireEvent.click(screen.getByRole('button', { name: /Registrar atendimento/ }));
    expect(window.location.hash).toBe('#attendance?new=true&equipment_id=7');
  });

  it('schedules a maintenance for the equipment when allowed', async () => {
    render(<EquipmentActivity equipmentId={7} canRegisterAttendance={false} canScheduleMaintenance />);
    await screen.findByText('PDV sem rede');
    fireEvent.click(screen.getByRole('button', { name: /Agendar manutenção/ }));
    expect(window.location.hash).toBe('#maintenances?new=true&equipment_id=7');
  });

  it('hides the register button without permission', async () => {
    render(<EquipmentActivity equipmentId={7} canRegisterAttendance={false} />);
    await screen.findByText('PDV sem rede');
    expect(screen.queryByRole('button', { name: /Registrar atendimento/ })).not.toBeInTheDocument();
  });
});
