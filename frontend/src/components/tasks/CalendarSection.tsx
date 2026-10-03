import React, { useState, useEffect, useCallback } from 'react';
import { formatDateTime, formatTime } from '@/lib/format';
import { useConfirm } from '@/hooks/useConfirm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Plus, Trash2, Clock, Wrench } from 'lucide-react';
import type { CalendarEvent } from '@/types/tasks';
import { organizationService } from '@/services/organizationService';

export const CalendarSection: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [eventType, setEventType] = useState('manutencao');
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await organizationService.getCalendarEvents();
      setEvents(data);
    } catch (err) {
      console.error('Falha ao carregar eventos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime || !endTime) return;
    if (new Date(endTime) < new Date(startTime)) {
      setError('A data/hora de término deve ser posterior ao início.');
      return;
    }

    try {
      setError(null);
      await organizationService.createCalendarEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        event_type: eventType,
      });
      setTitle('');
      setDescription('');
      setStartTime('');
      setEndTime('');
      setShowAdd(false);
      loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao agendar evento');
    }
  };

  const confirm = useConfirm();

  const handleDelete = async (id: number) => {
    if (!(await confirm({ title: 'Excluir este evento da agenda?' }))) return;
    try {
      await organizationService.deleteCalendarEvent(id);
      loadEvents();
    } catch (err) {
      console.error('Falha ao excluir evento:', err);
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'manutencao':
        return <Badge variant="destructive" className="text-[10px] py-0 h-4">Manutenção</Badge>;
      case 'compromisso':
        return <Badge variant="warning" className="text-[10px] py-0 h-4">Compromisso</Badge>;
      case 'escala':
        return <Badge variant="outline" className="text-[10px] py-0 h-4">Plantão/Escala</Badge>;
      default:
        return <Badge variant="default" className="text-[10px] py-0 h-4">Atividade</Badge>;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" />
            <span>Agenda</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Visitas, plantões e janelas de manutenção da equipe
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs flex items-center gap-1.5"
          onClick={() => setShowAdd(!showAdd)}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Novo</span>
        </Button>
      </CardHeader>

      <CardContent className="p-4 space-y-3 flex-1 overflow-y-auto">
        {showAdd && (
          <form onSubmit={handleCreate} className="p-3 rounded-lg border border-border bg-muted/30 space-y-3 mb-2">
            {error && <div className="text-xs text-destructive font-medium">{error}</div>}
            <Input
              placeholder="Ex: Reinicialização do Firewall Principal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-xs"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Início</label>
                <Input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Término</label>
                <Input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="manutencao">Janela de Manutenção</option>
                <option value="atividade">Atividade Programada</option>
                <option value="compromisso">Compromisso Técnico</option>
                <option value="escala">Escala de Plantão</option>
              </select>
              <Input
                placeholder="Observações breves..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAdd(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="h-7 text-xs">
                Confirmar Agendamento
              </Button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="text-center py-6 text-xs text-muted-foreground">Carregando eventos...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground flex flex-col items-center gap-1">
            <Wrench className="h-6 w-6 text-muted-foreground/50 mb-1" />
            <span>Nenhum evento programado no calendário no momento.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="p-3 rounded-lg border border-border bg-card hover:border-primary/40 transition-all shadow-xs space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{ev.title}</span>
                      {getEventBadge(ev.event_type)}
                    </div>
                    {ev.description && <p className="text-[11px] text-muted-foreground">{ev.description}</p>}
                  </div>
                  <button
                    onClick={() => handleDelete(ev.id)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    title="Excluir evento"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-primary" />
                    <span>Início: {formatDateTime(ev.start_time)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Até: {formatTime(ev.end_time)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
