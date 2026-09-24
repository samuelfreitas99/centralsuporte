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
    <div className="relative overflow-hidden rounded-2xl border border-blue-500/25 bg-gradient-to-r from-blue-950/40 via-slate-900/70 to-card/90 p-6 sm:p-7 shadow-xl backdrop-blur-xl">
      <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1">
              <Activity className="h-3 w-3" />
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
            <Clock className="h-3.5 w-3.5 text-blue-400" />
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
