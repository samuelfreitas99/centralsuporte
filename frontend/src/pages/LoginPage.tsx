import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor, informe o usuário e a senha.');
      return;
    }

    setError(null);
    try {
      await login(username.trim(), password);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Falha ao autenticar. Verifique sua conexão com o servidor.');
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="brand-badge">
            <span className="brand-dot"></span>
            Operação Interna
          </div>
          <h1 className="login-title">Central de Suporte</h1>
          <p className="login-subtitle">
            Central Operacional do Suporte Técnico — Gestão de conhecimento, atendimentos internos e tarefas.
          </p>
        </div>

        {error && (
          <div className="alert-error" role="alert">
            <span className="alert-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Usuário ou E-mail</label>
            <input
              id="username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex: admin ou seu.email@empresa.com"
              autoComplete="username"
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? 'Ocultar' : 'Exibir'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading-spinner-wrapper">
                <span className="spinner"></span>
                Autenticando...
              </span>
            ) : (
              'Entrar no Sistema'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p className="otrs-reminder">
            🔒 <strong>Atenção:</strong> A Central é um sistema interno complementar e não substitui o OTRS para chamados oficiais.
          </p>
        </div>
      </div>
    </div>
  );
};
