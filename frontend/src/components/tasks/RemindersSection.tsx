import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bell, Plus, CheckCircle2, Trash2, Clock } from 'lucide-react';
import type { Reminder } from '@/types/tasks';
import { organizationService } from '@/services/organizationService';

export const RemindersSection: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [priority, setPriority] = useState('media');
  const [description, setDescription] = useState('');

  const loadReminders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await organizationService.getReminders(undefined, 'manual');
      setReminders(data);
    } catch (err) {
      console.error('Falha ao carregar lembretes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !remindAt) return;
    try {
      await organizationService.createReminder({
        title: title.trim(),
        remind_at: new Date(remindAt).toISOString(),
        priority,
        description: description.trim() || undefined,
      });
      setTitle('');
      setRemindAt('');
      setDescription('');
      setShowAdd(false);
      loadReminders();
    } catch (err) {
      console.error('Falha ao criar lembrete:', err);
    }
  };

  const handleStatus = async (id: number, status: string) => {
    try {
      await organizationService.updateReminderStatus(id, status);
      loadReminders();
    } catch (err) {
      console.error('Falha ao atualizar status de lembrete:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja excluir este lembrete?')) return;
    try {
      await organizationService.deleteReminder(id);
      loadReminders();
    } catch (err) {
      console.error('Falha ao excluir lembrete:', err);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500" />
            <span>Meus lembretes</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Avisos pontuais para retorno de contato, conferência e rotinas
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs flex items-center gap-1.5"
          onClick={() => setShowAdd(!showAdd)}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Novo Lembrete</span>
        </Button>
      </CardHeader>

      <CardContent className="p-4 space-y-3 flex-1 overflow-y-auto">
        {showAdd && (
          <form onSubmit={handleCreate} className="p-3 rounded-lg border border-border bg-muted/30 space-y-3 mb-2">
            <Input
              placeholder="Ex: Ligar para gerente da Filial 04 sobre link"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-xs"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="datetime-local"
                value={remindAt}
                onChange={(e) => setRemindAt(e.target.value)}
                className="h-8 text-xs"
                required
              />
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="baixa">Prioridade Baixa</option>
                <option value="media">Prioridade Média</option>
                <option value="alta">Prioridade Alta</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAdd(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="h-7 text-xs">
                Salvar
              </Button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="text-center py-6 text-xs text-muted-foreground">Carregando lembretes...</div>
        ) : reminders.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground flex flex-col items-center gap-1">
            <Clock className="h-6 w-6 text-muted-foreground/50 mb-1" />
            <span>Nenhum lembrete registrado no momento.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {reminders.map((rem) => {
              const isDone = rem.status === 'concluido';
              return (
                <div
                  key={rem.id}
                  className={`p-3 rounded-lg border transition-all ${
                    isDone
                      ? 'bg-muted/20 border-border/40 opacity-70'
                      : 'bg-card border-border hover:border-primary/40 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {rem.title}
                        </span>
                        <Badge
                          variant={rem.priority === 'alta' ? 'destructive' : rem.priority === 'baixa' ? 'secondary' : 'default'}
                          className="text-[10px] py-0 h-4"
                        >
                          {rem.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(rem.remind_at).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {!isDone ? (
                        <button
                          onClick={() => handleStatus(rem.id, 'concluido')}
                          className="p-1 text-muted-foreground hover:text-emerald-500 transition-colors"
                          title="Marcar como concluído"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatus(rem.id, 'pendente')}
                          className="p-1 text-emerald-500 hover:text-muted-foreground transition-colors"
                          title="Reabrir lembrete"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(rem.id)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        title="Excluir lembrete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
