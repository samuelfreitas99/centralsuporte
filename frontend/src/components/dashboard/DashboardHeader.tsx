import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Clock, ShieldCheck } from 'lucide-react';

export const DashboardHeader: React.FC = () => {
  const { user } = useAuth();
  const today = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const formattedDate = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/15 via-primary/5 to-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Turno Operacional Ativo
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Painel do Técnico — {user?.username}
          </h1>
          <p className="text-sm text-muted-foreground">
            Centralize suas tarefas operacionais, acompanhe atendimentos vinculados ao OTRS e consulte procedimentos rápidos.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>{formattedDate}</span>
          </Badge>
          <Badge variant="success" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Perfil: {user?.role?.name || 'Técnico'}</span>
          </Badge>
        </div>
      </div>
    </div>
  );
};
