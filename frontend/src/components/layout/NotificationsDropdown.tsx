import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bell, BellRing, CheckCircle2, Clock, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { formatRelative } from '@/lib/format';
import { priorityLabel } from '@/lib/status';
import {
  ensurePushSubscription,
  notificationPermission,
  requestNotificationPermission,
  showNotification,
  takeUnnotified,
} from '@/lib/notifications';
import { organizationService } from '@/services/organizationService';
import { automationService } from '@/services/automationService';
import { pushService } from '@/services/pushService';
import type { Reminder } from '@/types/tasks';

const POLL_MS = 60_000;
const MAX_SYSTEM_NOTIFICATIONS = 3;

const isDue = (r: Reminder) => new Date(r.remind_at).getTime() <= Date.now();
const targetFor = (r: Reminder) => (r.task_id ? `tasks?id=${r.task_id}` : 'tasks');

/**
 * Sino de avisos: lembretes que já chegaram na hora e alertas automáticos (tarefas vencendo,
 * manutenções do dia, equipamentos com falhas repetidas). Avisos novos também viram
 * notificação do sistema quando o navegador permite.
 */
export const NotificationsDropdown: React.FC = () => {
  const { hasPermission } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [due, setDue] = useState<Reminder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [permission, setPermission] = useState(notificationPermission);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const pending = await organizationService.getReminders('pendente');
      const nowDue = pending.filter(isDue).sort((a, b) => +new Date(b.remind_at) - +new Date(a.remind_at));
      setDue(nowDue);
      setLoaded(true);

      const fresh = new Set(takeUnnotified(nowDue.map((r) => r.id)));
      const toShow = nowDue.filter((r) => fresh.has(r.id));
      toShow.slice(0, MAX_SYSTEM_NOTIFICATIONS).forEach((r) =>
        showNotification(r.title, r.description || 'Abra a Central para ver os detalhes.', `/#${targetFor(r)}`, `reminder-${r.id}`)
      );
      if (toShow.length > MAX_SYSTEM_NOTIFICATIONS) {
        showNotification('Central de Suporte', `Mais ${toShow.length - MAX_SYSTEM_NOTIFICATIONS} avisos no sino.`, '/#dashboard', 'reminder-more');
      }
    } catch (err) {
      console.error('Falha ao carregar avisos:', err);
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      load();
      timer = setInterval(load, POLL_MS);
    };
    const handle = setTimeout(start, 0);
    return () => {
      clearTimeout(handle);
      if (timer) clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    if (!isOpen) return;
    const close = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [isOpen]);

  const setStatus = async (id: number, status: 'concluido' | 'dispensado') => {
    try {
      await organizationService.updateReminderStatus(id, status);
      setDue((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Falha ao atualizar aviso:', err);
    }
  };

  const checkNow = async () => {
    setChecking(true);
    try {
      const res = await automationService.triggerRules();
      await load();
      setMessage(res.total_created > 0 ? `${res.total_created} aviso(s) novo(s)` : 'Nada novo. Tudo em dia.');
    } catch {
      setMessage('Não foi possível verificar agora.');
    } finally {
      setChecking(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const sendTest = async () => {
    try {
      await ensurePushSubscription();
      const { sent } = await pushService.sendTest();
      setMessage(
        sent > 0
          ? `Teste enviado para ${sent} dispositivo(s). Deve aparecer em instantes.`
          : 'Este navegador ainda não recebe avisos com a Central fechada (use o endereço https).'
      );
    } catch {
      setMessage('Não foi possível enviar o teste.');
    } finally {
      setTimeout(() => setMessage(null), 6000);
    }
  };

  const enableNotifications = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') ensurePushSubscription();
  };

  // Mantém a inscrição de push em dia (servidor pode ter sido reinstalado, outro usuário no mesmo PC etc.).
  useEffect(() => {
    if (permission === 'granted') ensurePushSubscription();
  }, [permission]);

  const open = (r: Reminder) => {
    window.location.hash = targetFor(r);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen((v) => !v)}
        className="relative h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
        aria-label={due.length ? `Avisos (${due.length})` : 'Avisos'}
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4" />
        {due.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {due.length > 9 ? '9+' : due.length}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border/70 bg-popover text-popover-foreground shadow-lg sm:w-96"
          >
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 p-3">
              <span className="text-sm font-semibold text-foreground">Avisos</span>
              {hasPermission('tasks:write') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkNow}
                  disabled={checking}
                  className="h-7 gap-1.5 px-2 text-[11px] cursor-pointer"
                  title="Procura agora tarefas vencendo, manutenções do dia e equipamentos com falhas repetidas"
                >
                  <RefreshCw className={`h-3 w-3 ${checking ? 'animate-spin' : ''}`} />
                  {checking ? 'Verificando...' : 'Verificar agora'}
                </Button>
              )}
            </div>

            {message && (
              <div className="border-b border-primary/20 bg-primary/10 px-3 py-1.5 text-center text-[11px] font-medium text-primary">
                {message}
              </div>
            )}

            <div className="max-h-80 divide-y divide-border/40 overflow-y-auto">
              {!loaded ? (
                <p className="p-6 text-center text-xs text-muted-foreground">Carregando...</p>
              ) : due.length === 0 ? (
                <div className="space-y-1.5 p-6 text-center">
                  <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500 opacity-80" />
                  <p className="text-xs font-medium text-foreground">Nenhum aviso agora.</p>
                  <p className="text-[11px] text-muted-foreground">Seus lembretes aparecem aqui na hora marcada.</p>
                </div>
              ) : (
                due.map((r) => {
                  const urgent = r.priority === 'urgente' || r.priority === 'alta';
                  return (
                    <div key={r.id} className="group flex items-start gap-2.5 p-3 hover:bg-muted/30">
                      {urgent ? (
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                      ) : (
                        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <button type="button" onClick={() => open(r)} className="min-w-0 flex-1 text-left cursor-pointer">
                        <span className="block text-xs font-medium text-foreground">{r.title}</span>
                        {r.description && (
                          <span className="mt-0.5 block line-clamp-2 text-[11px] text-muted-foreground">{r.description}</span>
                        )}
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          {formatRelative(r.remind_at)} · {r.source === 'automacao' ? 'automático' : 'lembrete'} · {priorityLabel(r.priority)}
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => setStatus(r.id, 'concluido')}
                          className="rounded p-1 text-emerald-500 hover:bg-emerald-500/15 cursor-pointer"
                          aria-label="Marcar como resolvido"
                          title="Resolvido"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus(r.id, 'dispensado')}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                          aria-label="Dispensar aviso"
                          title="Dispensar"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {permission === 'default' && (
              <button
                type="button"
                onClick={enableNotifications}
                className="flex w-full items-center justify-center gap-1.5 border-t border-border/60 bg-muted/20 p-2.5 text-[11px] font-medium text-primary hover:bg-muted/40 cursor-pointer"
              >
                <BellRing className="h-3.5 w-3.5" />
                Ativar notificações no computador
              </button>
            )}
            {permission === 'granted' && (
              <button
                type="button"
                onClick={sendTest}
                className="w-full border-t border-border/60 bg-muted/20 p-2 text-center text-[11px] text-muted-foreground hover:bg-muted/40 hover:text-foreground cursor-pointer"
              >
                Enviar notificação de teste
              </button>
            )}
            {permission === 'denied' && (
              <p className="border-t border-border/60 bg-muted/20 p-2 text-center text-[10px] text-muted-foreground">
                Notificações bloqueadas no navegador. Libere nas configurações do site para receber avisos.
              </p>
            )}
            {permission === 'unsupported' && (
              <p className="border-t border-border/60 bg-muted/20 p-2 text-center text-[10px] text-muted-foreground">
                Para avisos no computador, acesse a Central pelo endereço seguro (https).
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
