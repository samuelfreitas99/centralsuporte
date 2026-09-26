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
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between pb-4 border-b border-border/40">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 mb-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            Turno Operacional Ativo
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl font-heading">
          Olá, {user?.username}
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          Estação de comando. Acompanhe diagnósticos, consulte base de conhecimento e gerencie atividades de suporte.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Badge variant="secondary" className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formattedDate}</span>
        </Badge>
        <Badge variant="default" className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium">
          <ShieldCheck className="h-3 w-3" />
          <span>{user?.role?.name || 'Técnico'}</span>
        </Badge>
      </div>
    </div>
  );
};
