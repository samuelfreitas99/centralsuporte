import React, { useState } from 'react';
import { AppLayout } from './layout/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { TasksPage } from '@/pages/TasksPage';
import { KnowledgePage } from '@/pages/KnowledgePage';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NAV_ITEMS } from './layout/nav-items';
import { ArrowLeft } from 'lucide-react';
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
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentTab('dashboard')}
              className="flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar ao Dashboard</span>
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-foreground">{activeNavItem?.label}</span>
              <Badge variant="secondary">Módulo Operacional</Badge>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{activeNavItem?.label}</CardTitle>
              <CardDescription>
                Este módulo está programado no Roadmap e será integrado nas próximas fases.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                A Central Operacional do Suporte Técnico está sendo implementada de forma incremental, garantindo qualidade, segurança e testes rigorosos a cada fase.
              </p>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="font-semibold text-foreground mb-1">Diretriz Arquitetural:</p>
                <p>
                  Informações operacionais, comandos, checklists e procedimentos serão armazenados aqui para apoiar o técnico no dia a dia, mantendo o OTRS como sistema oficial de chamados.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
};
