import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccessPage } from '@/pages/AccessPage';

const hasPermission = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ hasPermission }) }));
vi.mock('@/pages/UsersPage', () => ({ UsersPage: () => <div>lista de usuários</div> }));
vi.mock('@/pages/RolesPage', () => ({ RolesPage: () => <div>matriz de perfis</div> }));

describe('AccessPage (Usuários e Permissões)', () => {
  it('shows both tabs for admins and switches through navigation', () => {
    hasPermission.mockReturnValue(true);
    const navigate = vi.fn();
    render(<AccessPage tab="users" navigate={navigate} />);

    expect(screen.getByText('lista de usuários')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Usuários/ })).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByRole('tab', { name: /Perfis e permissões/ }));
    expect(navigate).toHaveBeenCalledWith('roles');
  });

  it('renders the roles matrix on #roles', () => {
    hasPermission.mockReturnValue(true);
    render(<AccessPage tab="roles" navigate={vi.fn()} />);
    expect(screen.getByText('matriz de perfis')).toBeInTheDocument();
  });

  it('hides the tab switcher when only one area is allowed', () => {
    hasPermission.mockImplementation((p: string) => p === 'users:read');
    render(<AccessPage tab="users" navigate={vi.fn()} />);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });
});
