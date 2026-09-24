import React, { useState } from 'react';
import { AppLayout } from './layout/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { TasksPage } from '@/pages/TasksPage';
import { KnowledgePage } from '@/pages/KnowledgePage';
import { CommandsPage } from '@/pages/CommandsPage';
import { AttendancePage } from '@/pages/AttendancePage';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NAV_ITEMS } from './layout/nav-items';
import { ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const AuthenticatedView: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('dashboard');

  const activeNavItem = NAV_ITEMS.find((item) => item.id === currentTab);

  return (
    <AppLayout currentTab={currentTab} onSelectTab={setCurrentTab}>
      {currentTab === 'dashboard' ? (
        <DashboardPage />
      ) : currentTab === 'tasks' ? (
        <TasksPage />
      ) : currentTab === 'knowledge' ? (
        <KnowledgePage />
      ) : currentTab === 'commands' ? (
        <CommandsPage />
      ) : currentTab === 'attendance' ? (
        <AttendancePage />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentTab('dashboard')}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar ao Dashboard</span>
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-foreground font-heading">{activeNavItem?.label}</span>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-blue-400" />
                <span>Roadmap Futuro</span>
              </Badge>
            </div>
          </div>

          <Card className="border-border/80 bg-card/75 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="font-heading">{activeNavItem?.label}</CardTitle>
              <CardDescription>
                Este módulo está programado no Roadmap e será integrado sequencialmente nas próximas fases.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                A Central Operacional do Suporte Técnico está sendo implementada de forma incremental e robusta, garantindo qualidade, ergonomia de uso e alinhamento com a equipe de TI.
              </p>
              <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-4">
                <p className="font-semibold text-slate-200 mb-1">Diretriz Arquitetural:</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  O OTRS permanece como fonte oficial para abertura, comunicação e fechamento de chamados. A Central armazena diagnósticos, inventário, procedimentos operacionais e comandos para uso imediato dos analistas de suporte.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
};
