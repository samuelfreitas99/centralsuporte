import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Clock, ShieldCheck, Activity } from 'lucide-react';

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
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/70 p-6 sm:p-7 shadow-sm backdrop-blur-md">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span>Turno Operacional Ativo</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl font-heading">
            Painel do Técnico — {user?.username}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Painel de operação diária da equipe de suporte técnico. Acompanhe diagnósticos, consulte comandos rápidos e acesse a base de conhecimento interno.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center shrink-0">
          <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-border/80 bg-background/50">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
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
