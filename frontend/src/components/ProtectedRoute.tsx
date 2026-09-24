import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { LoginPage } from '../pages/LoginPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredRole,
}) => {
  const { isAuthenticated, isLoading, hasPermission, hasRole } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0d0e15',
        color: '#94a3b8',
        fontSize: '16px',
        gap: '12px'
      }}>
        <div style={{
          width: '20px',
          height: '20px',
          border: '3px solid rgba(255,255,255,0.2)',
          borderTopColor: '#a855f7',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite'
        }} />
        <span>Validando sessão...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#ef4444',
        background: 'rgba(239, 68, 68, 0.1)',
        borderRadius: '12px',
        margin: '40px auto',
        maxWidth: '500px'
      }}>
        <h2>Acesso Negado</h2>
        <p>Você não possui a permissão necessária ({requiredPermission}) para acessar esta área.</p>
      </div>
    );
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#ef4444',
        background: 'rgba(239, 68, 68, 0.1)',
        borderRadius: '12px',
        margin: '40px auto',
        maxWidth: '500px'
      }}>
        <h2>Acesso Negado</h2>
        <p>Seu perfil não possui autorização para este recurso.</p>
      </div>
    );
  }

  return <>{children}</>;
};
