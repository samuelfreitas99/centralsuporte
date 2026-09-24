import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { organizationService } from '@/services/organizationService';
import { automationService } from '@/services/automationService';
import type { Reminder } from '@/types/tasks';

export const NotificationsDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [lastCheckMessage, setLastCheckMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const loadReminders = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await organizationService.getReminders('pendente');
      setReminders(data);
    } catch (err) {
      console.error('Falha ao carregar lembretes:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReminders();
    // Poll every 2 minutes
    const interval = setInterval(loadReminders, 120000);
    return () => clearInterval(interval);
  }, [loadReminders]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleTriggerAutomation = async () => {
    setIsTriggering(true);
    setLastCheckMessage(null);
    try {
      const res = await automationService.triggerRules();
      await loadReminders();
      const count = res.total_created;
      setLastCheckMessage(
        count > 0
          ? `${count} novo(s) alerta(s) gerado(s)`
          : 'Regras verificadas: tudo em dia'
      );
    } catch (err) {
      console.error('Erro ao disparar regras:', err);
      setLastCheckMessage('Falha ao executar verificação');
    } finally {
      setIsTriggering(false);
      setTimeout(() => setLastCheckMessage(null), 4000);
    }
  };

  const handleResolveReminder = async (id: number) => {
    try {
      await organizationService.updateReminderStatus(id, 'concluido');
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Erro ao concluir lembrete:', err);
    }
  };

  const handleDismissReminder = async (id: number) => {
    try {
      await organizationService.updateReminderStatus(id, 'dispensado');
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Erro ao dispensar lembrete:', err);
    }
  };

  const pendingCount = reminders.length;

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative text-muted-foreground hover:text-foreground hover:bg-white/[0.06] rounded-xl cursor-pointer"
        aria-label="Abrir notificações e lembretes"
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4" />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </Button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between p-3.5 border-b border-border/60 bg-muted/20">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold text-foreground font-heading">
                Alertas & Regras Reativas
              </span>
              {pendingCount > 0 && (
                <span className="text-[10px] font-semibold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full border border-primary/20">
                  {pendingCount}
                </span>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleTriggerAutomation}
              disabled={isTriggering}
              className="h-7 px-2 text-[11px] gap-1.5 border-border/70 text-foreground hover:border-primary/40 cursor-pointer"
              title="Executar varredura de regras agora"
            >
              <RefreshCw className={`h-3 w-3 text-primary ${isTriggering ? 'animate-spin' : ''}`} />
              <span>{isTriggering ? 'Verificando...' : 'Verificar'}</span>
            </Button>
          </div>

          {/* Feedback message banner if any */}
          {lastCheckMessage && (
            <div className="bg-primary/10 border-b border-primary/20 px-3 py-1.5 text-[11px] text-primary text-center font-medium">
              {lastCheckMessage}
            </div>
          )}

          {/* List Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
            {isLoading && reminders.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Carregando lembretes...
              </div>
            ) : reminders.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto opacity-80" />
                <p className="text-xs font-semibold text-foreground">Tudo em dia!</p>
                <p className="text-[11px] text-muted-foreground">
                  Nenhum prazo vencendo, manutenção iminente ou alerta pendente no momento.
                </p>
              </div>
            ) : (
              reminders.map((rem) => {
                const isUrgent = rem.priority === 'urgente' || rem.priority === 'alta';
                return (
                  <div
                    key={rem.id}
                    className="p-3 hover:bg-muted/30 transition-colors flex items-start gap-2.5 group"
                  >
                    <div className="mt-0.5 shrink-0">
                      {isUrgent ? (
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-sky-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {rem.title}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border shrink-0 ${
                            isUrgent
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-muted text-muted-foreground border-border/60'
                          }`}
                        >
                          {rem.priority}
                        </span>
                      </div>
                      {rem.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {rem.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(rem.remind_at).toLocaleDateString('pt-BR')}
                        </span>
                        <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleResolveReminder(rem.id)}
                            className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded cursor-pointer"
                            title="Marcar como resolvido"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDismissReminder(rem.id)}
                            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded cursor-pointer"
                            title="Dispensar alerta"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="p-2.5 border-t border-border/60 bg-muted/20 text-center">
            <span className="text-[10px] text-muted-foreground">
              Scheduler Reativo • Verificações automáticas ativas a cada 60 min
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
