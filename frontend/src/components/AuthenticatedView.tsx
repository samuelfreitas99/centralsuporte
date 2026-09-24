import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from './layout/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Info, CheckCircle2 } from 'lucide-react';

export const AuthenticatedView: React.FC = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');

  return (
    <AppLayout currentTab={currentTab} onSelectTab={setCurrentTab}>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Sessão Ativa</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Bem-vindo à Central Operacional, {user?.username}!
            </h1>
            <p className="text-sm text-muted-foreground">
              Perfil ativo: <strong className="text-foreground">{user?.role?.name || 'Geral'}</strong> — Sistema interno de apoio técnico e conhecimento.
            </p>
          </div>
        </div>

        {/* Info Grid using shadcn Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Card: Permissões */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <CardTitle>Perfil e Permissões do Usuário</CardTitle>
              </div>
              <CardDescription>
                Permissões concedidas pelo backend para o perfil <strong>{user?.role?.name}</strong>:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {user?.role?.permissions && user.role.permissions.length > 0 ? (
                  user.role.permissions.map((perm) => (
                    <Badge key={perm.id} variant="success" className="gap-1 font-mono text-[11px]">
                      <CheckCircle2 className="h-3 w-3" />
                      {perm.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs italic text-muted-foreground">Nenhuma permissão específica</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card: Diretrizes e OTRS */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                <CardTitle>Diretrizes de Operação</CardTitle>
              </div>
              <CardDescription>
                Separação entre chamados oficiais e operação técnica:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">OTRS:</strong> Fonte oficial para abertura, comunicação com usuário, SLA e encerramento.
              </p>
              <p>
                <strong className="text-foreground">Central de Suporte:</strong> Diagnósticos, soluções, comandos técnicos, checklists e procedimentos operacionais.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};
