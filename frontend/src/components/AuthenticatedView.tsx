import React from 'react';
import { useAuth } from '../hooks/useAuth';
import './AuthenticatedView.css';

export const AuthenticatedView: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="auth-view-container">
      <header className="auth-header">
        <div className="header-brand">
          <div className="brand-dot"></div>
          <div>
            <h1 className="brand-title">Central de Suporte</h1>
            <span className="brand-subtitle">Operação Interna do Suporte Técnico</span>
          </div>
        </div>

        <div className="user-profile-bar">
          <div className="user-info">
            <span className="user-name">{user?.username}</span>
            <span className="user-role-badge">{user?.role?.name || 'Sem perfil'}</span>
          </div>
          <button onClick={logout} className="logout-button" title="Encerrar sessão">
            Sair
          </button>
        </div>
      </header>

      <main className="auth-content">
        <div className="welcome-banner">
          <h2>Bem-vindo à Central Operacional, {user?.username}!</h2>
          <p>
            Sessão autenticada via JWT no Backend. Seu perfil atual é <strong>{user?.role?.name}</strong>.
          </p>
        </div>

        <div className="cards-grid">
          <div className="info-card">
            <h3>Perfil e Permissões</h3>
            <p className="card-desc">Permissões ativas concedidas pelo backend para o seu usuário:</p>
            <div className="permissions-tags">
              {user?.role?.permissions && user.role.permissions.length > 0 ? (
                user.role.permissions.map((perm) => (
                  <span key={perm.id} className="permission-tag" title={perm.description}>
                    ✓ {perm.name}
                  </span>
                ))
              ) : (
                <span className="no-perms">Nenhuma permissão específica</span>
              )}
            </div>
          </div>

          <div className="info-card">
            <h3>Integração Operacional</h3>
            <p className="card-desc">Diretrizes de arquitetura do sistema:</p>
            <ul className="info-list">
              <li><strong>OTRS:</strong> Sistema oficial para abertura, comunicação e encerramento de chamados.</li>
              <li><strong>Central:</strong> Operação interna, procedimentos, comandos técnicos e base de conhecimento.</li>
              <li><strong>Sessão:</strong> Autenticação local JWT com validação contínua no Backend (FastAPI).</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};
