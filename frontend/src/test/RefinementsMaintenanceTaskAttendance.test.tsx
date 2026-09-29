import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EquipmentMultiSelect } from '@/components/maintenance/EquipmentMultiSelect';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';
import type { EquipmentItem } from '@/types/infrastructure';
import type { Task } from '@/types/tasks';

const mockEquipments: EquipmentItem[] = [
  { id: 1, hostname: 'PDV-01', model: 'Dell OptiPlex 3080', patrimony: 'PAT-1001', serial_number: 'SN123', status: 'ativo', equipment_type: 'computador', created_at: '', updated_at: '' },
  { id: 2, hostname: 'PDV-02', model: 'Dell OptiPlex 3080', patrimony: 'PAT-1002', serial_number: 'SN124', status: 'ativo', equipment_type: 'computador', created_at: '', updated_at: '' },
  { id: 3, hostname: 'SRV-01', model: 'PowerEdge T140', patrimony: 'PAT-2001', serial_number: 'SN999', status: 'ativo', equipment_type: 'servidor', created_at: '', updated_at: '' },
];

describe('Refinements - Maintenance Multi-Equipment Selection', () => {
  it('renders multi-select with search and toggles equipment items', () => {
    const onChange = vi.fn();
    render(
      <EquipmentMultiSelect
        equipments={mockEquipments}
        selectedIds={[1]}
        onChange={onChange}
      />
    );

    // Should display selected equipment badge
    expect(screen.getByText('PDV-01')).toBeInTheDocument();
    expect(screen.getByText('(PAT-1001)')).toBeInTheDocument();
    expect(screen.getAllByText(/1 equipamento selecionado/i)[0]).toBeInTheDocument();

    // Open dropdown
    const trigger = screen.getAllByRole('button', { name: /equipamento selecionado/i })[0];
    fireEvent.click(trigger);

    // Search input should be visible
    const searchInput = screen.getByPlaceholderText(/buscar por hostname/i);
    expect(searchInput).toBeInTheDocument();

    // Filter by SRV
    fireEvent.change(searchInput, { target: { value: 'SRV' } });
    expect(screen.queryByText('PDV-02')).not.toBeInTheDocument();
    expect(screen.getByText('SRV-01')).toBeInTheDocument();

    // Click SRV-01 to add to selection
    fireEvent.click(screen.getByText('SRV-01'));
    expect(onChange).toHaveBeenCalledWith([1, 3]);
  });

  it('removes equipment when clicking badge close button', () => {
    const onChange = vi.fn();
    render(
      <EquipmentMultiSelect
        equipments={mockEquipments}
        selectedIds={[1, 2]}
        onChange={onChange}
      />
    );

    expect(screen.getAllByText(/2 equipamentos selecionados/i)[0]).toBeInTheDocument();
    const removeBtn = screen.getByLabelText(/remover PDV-01/i);
    fireEvent.click(removeBtn);

    expect(onChange).toHaveBeenCalledWith([2]);
  });
});

describe('Refinements - Task Details Drawer vs Direct Edit', () => {
  const mockTask: Task = {
    id: 42,
    title: 'Configurar switches da loja',
    description: 'Realizar configuração de VLANs e portas de acesso',
    project_id: 10,
    creator_id: 1,
    priority: 'alta',
    status: 'em_andamento',
    visibility: 'todos',
    assigned_users: [{ id: 1, username: 'tecnico_joao', email: 'joao@empresa.com', is_active: true }],
    checklists: [],
    created_at: '2026-09-29T10:00:00Z',
    updated_at: '2026-09-29T10:00:00Z',
  };

  it('renders read-only task details and triggers onEdit only on explicit button click', () => {
    const onEdit = vi.fn();
    const onOpenChange = vi.fn();
    const onTaskUpdated = vi.fn();

    render(
      <TaskDetailDrawer
        open={true}
        onOpenChange={onOpenChange}
        task={mockTask}
        onTaskUpdated={onTaskUpdated}
        onEditTask={onEdit}
      />
    );

    // Detail view elements
    expect(screen.getByText('Configurar switches da loja')).toBeInTheDocument();
    expect(screen.getByText('Realizar configuração de VLANs e portas de acesso')).toBeInTheDocument();
    expect(screen.getByText('tecnico_joao')).toBeInTheDocument();

    // Edit callback should NOT have been called on open
    expect(onEdit).not.toHaveBeenCalled();

    // Explicit "Editar" button
    const editBtn = screen.getByRole('button', { name: /editar detalhes/i });
    fireEvent.click(editBtn);

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(mockTask);
  });
});
