import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from '../pages/LoginPage';
import { AuthContext } from '../context/AuthContextDef';
import type { AuthContextType } from '../types/auth';

const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockHasPermission = vi.fn();
const mockHasRole = vi.fn();

const defaultAuthContextValue: AuthContextType = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  login: mockLogin,
  logout: mockLogout,
  hasPermission: mockHasPermission,
  hasRole: mockHasRole,
};

function renderLoginPage(contextOverride?: Partial<AuthContextType>) {
  return render(
    <AuthContext.Provider value={{ ...defaultAuthContextValue, ...contextOverride }}>
      <LoginPage />
    </AuthContext.Provider>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form elements correctly', () => {
    renderLoginPage();

    expect(screen.getByText('Central de Suporte')).toBeInTheDocument();
    expect(screen.getByLabelText(/usuário ou e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar no sistema/i })).toBeInTheDocument();
    expect(screen.getByText(/a central é um sistema interno complementar/i)).toBeInTheDocument();
  });

  it('toggles password visibility when toggle button is clicked', () => {
    renderLoginPage();

    const passwordInput = screen.getByLabelText(/senha/i) as HTMLInputElement;
    const toggleBtn = screen.getByRole('button', { name: /exibir/i });

    expect(passwordInput.type).toBe('password');

    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe('text');
    expect(screen.getByRole('button', { name: /ocultar/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ocultar/i }));
    expect(passwordInput.type).toBe('password');
  });

  it('calls login with username and password when submitted', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/usuário ou e-mail/i), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByLabelText(/senha/i), {
      target: { value: 'admin123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /entrar no sistema/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin', 'admin123');
    });
  });

  it('displays error message when login fails', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Credenciais inválidas'));
    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/usuário ou e-mail/i), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByLabelText(/senha/i), {
      target: { value: 'wrongpassword' },
    });

    fireEvent.click(screen.getByRole('button', { name: /entrar no sistema/i }));

    await waitFor(() => {
      expect(screen.getByText('Credenciais inválidas')).toBeInTheDocument();
    });
  });
});
