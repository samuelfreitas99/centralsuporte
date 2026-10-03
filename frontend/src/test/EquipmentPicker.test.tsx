import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EquipmentPicker } from '@/components/infrastructure/EquipmentPicker';
import { infrastructureService } from '@/services/infrastructureService';
import type { EquipmentItem } from '@/types/infrastructure';

vi.mock('@/services/infrastructureService');

const pdv: EquipmentItem = {
  id: 7,
  hostname: 'PDV-03',
  patrimony: 'PAT-0003',
  ip_address: '10.0.3.13',
  equipment_type: 'computador',
  status: 'ativo',
  created_at: '',
  updated_at: '',
};

describe('EquipmentPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(infrastructureService.getEquipment).mockResolvedValue([pdv]);
  });

  it('searches the inventory on the server and selects an equipment', async () => {
    const onChange = vi.fn();
    render(<EquipmentPicker value={{ id: null, name: '' }} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Equipamento'), { target: { value: 'pdv' } });

    await waitFor(() => expect(infrastructureService.getEquipment).toHaveBeenCalledWith({ q: 'pdv' }));
    fireEvent.click(await screen.findByText('PDV-03 · PAT-0003'));

    expect(onChange).toHaveBeenCalledWith({ id: 7, name: 'PDV-03 · PAT-0003' }, pdv);
  });

  it('allows a free-text equipment that is not in the inventory', async () => {
    const onChange = vi.fn();
    vi.mocked(infrastructureService.getEquipment).mockResolvedValue([]);
    render(<EquipmentPicker value={{ id: null, name: '' }} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Equipamento'), { target: { value: 'Notebook visitante' } });
    fireEvent.click(await screen.findByText(/Usar “Notebook visitante” sem vincular/));

    expect(onChange).toHaveBeenCalledWith({ id: null, name: 'Notebook visitante' });
  });

  it('shows the selected equipment and can clear it', () => {
    const onChange = vi.fn();
    render(<EquipmentPicker value={{ id: 7, name: 'PDV-03 · PAT-0003' }} onChange={onChange} />);

    expect(screen.getByText('PDV-03 · PAT-0003')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remover equipamento' }));
    expect(onChange).toHaveBeenCalledWith({ id: null, name: '' });
  });
});
