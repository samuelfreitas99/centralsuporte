import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User as UserIcon,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Copy,
  Check,
  X,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { auditService } from '@/services/auditService';
import type { AuditLogItem } from '@/types/audit';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [availableEntities, setAvailableEntities] = useState<string[]>([]);

  // Modal inspection
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  // Load metadata
  useEffect(() => {
    auditService
      .getMetadata()
      .then((data) => {
        setAvailableActions(data.actions);
        setAvailableEntities(data.entity_types);
      })
      .catch((err) => console.error('Falha ao carregar metadados de auditoria:', err));
  }, []);

  const loadAuditLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await auditService.getAuditLogs({
        page,
        limit,
        action: selectedAction || undefined,
        entity_type: selectedEntity || undefined,
        search: search.trim() || undefined,
      });
      setLogs(response.results);
      setTotal(response.total);
    } catch (err: any) {
      console.error('Erro ao carregar logs de auditoria:', err);
      setError(err.message || 'Falha ao recuperar registros de auditoria.');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, selectedAction, selectedEntity, search]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  // Handle Copy JSON Details
  const handleCopyDetails = () => {
    if (!selectedLog?.details) return;
    navigator.clipboard.writeText(selectedLog.details);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const getActionBadgeStyle = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('CREATE') || act === 'LOGIN') {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (act.includes('DELETE') || act.includes('FAILED') || act.includes('BLOCKED')) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
    if (act.includes('UPDATE')) {
      return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    }
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
              Auditoria
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3" />
              Imutável
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Registro cronológico e rastreabilidade detalhada de todas as operações sensíveis do sistema.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadAuditLogs()}
          disabled={isLoading}
          className="gap-2 text-xs border-border/80 self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Atualizar Trilha</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="border-border/80 bg-card/70 backdrop-blur-sm">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Filtrar por usuário, IP, ação ou detalhe..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9 text-xs rounded-lg border-border/70 bg-background/60"
              />
            </div>

            {/* Action Select */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <select
                aria-label="Filtrar por ação"
                value={selectedAction}
                onChange={(e) => {
                  setSelectedAction(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 px-2.5 text-xs rounded-lg border border-border/70 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/40 cursor-pointer"
              >
                <option value="">Todas as Ações</option>
                {availableActions.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>

            {/* Entity Select */}
            <div className="flex items-center gap-1.5">
              <Laptop className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <select
                aria-label="Filtrar por entidade"
                value={selectedEntity}
                onChange={(e) => {
                  setSelectedEntity(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 px-2.5 text-xs rounded-lg border border-border/70 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/40 cursor-pointer"
              >
                <option value="">Todas as Entidades</option>
                {availableEntities.map((ent) => (
                  <option key={ent} value={ent}>
                    {ent.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content State */}
      {error ? (
        <Card className="border-destructive/30 bg-destructive/5 p-6 text-center text-xs text-destructive space-y-2">
          <AlertTriangle className="h-6 w-6 mx-auto" />
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={() => loadAuditLogs()} className="mt-2 text-xs">
            Tentar Novamente
          </Button>
        </Card>
      ) : isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="p-3">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </Card>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-card/30 p-12 text-center">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Nenhum evento registrado</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Não encontramos logs de auditoria correspondentes aos filtros aplicados.
            </p>
          </div>
        </Card>
      ) : (
        /* Logs Table Card */
        <Card className="border-border/80 bg-card/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground bg-muted/20 text-left">
                  <th className="py-3 px-4 font-semibold">Data / Hora</th>
                  <th className="py-3 px-4 font-semibold">Usuário</th>
                  <th className="py-3 px-4 font-semibold">Ação</th>
                  <th className="py-3 px-4 font-semibold">Entidade</th>
                  <th className="py-3 px-4 font-semibold">Endereço IP</th>
                  <th className="py-3 px-4 font-semibold text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span>{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span>{log.username || 'sistema'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getActionBadgeStyle(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      <span className="font-mono text-foreground font-medium uppercase">
                        {log.entity_type}
                      </span>
                      {log.entity_id && (
                        <span className="text-[11px] text-muted-foreground ml-1">#{log.entity_id}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                      {log.ip_address || '—'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {log.details ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          className="h-7 px-2.5 text-xs text-primary gap-1 hover:bg-primary/10 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Inspecionar</span>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">Sem payload</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border-t border-border/60 bg-muted/10 text-xs text-muted-foreground">
            <div>
              Exibindo <strong className="text-foreground">{logs.length}</strong> de{' '}
              <strong className="text-foreground">{total}</strong> registros
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="h-7 w-7 p-0 cursor-pointer"
                title="Página anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[11px]">
                Página <strong className="text-foreground">{page}</strong> de{' '}
                <strong className="text-foreground">{totalPages}</strong>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="h-7 w-7 p-0 cursor-pointer"
                title="Próxima página"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Log Inspection Lightbox / Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl border-border bg-card shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <FileCode2 className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base font-semibold font-heading">
                    Detalhes da Operação #{selectedLog.id}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {selectedLog.action} em {selectedLog.entity_type} por {selectedLog.username} às{' '}
                    {new Date(selectedLog.created_at).toLocaleString('pt-BR')}
                  </CardDescription>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-2.5 rounded-lg border border-border/60">
                <div>
                  <span className="text-muted-foreground">Endereço IP:</span>{' '}
                  <span className="font-mono text-foreground">{selectedLog.ip_address || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">ID do Alvo:</span>{' '}
                  <span className="font-mono text-foreground">{selectedLog.entity_id || '—'}</span>
                </div>
                {selectedLog.user_agent && (
                  <div className="col-span-2 truncate">
                    <span className="text-muted-foreground">User Agent:</span>{' '}
                    <span className="font-mono text-[11px] text-foreground">{selectedLog.user_agent}</span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-foreground">Payload Sanitizado:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyDetails}
                    className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {hasCopied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar JSON</span>
                      </>
                    )}
                  </Button>
                </div>
                <pre className="p-3 rounded-lg bg-background/80 border border-border/80 font-mono text-[11px] text-foreground max-h-72 overflow-y-auto leading-relaxed">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(selectedLog.details || '{}'), null, 2);
                    } catch {
                      return selectedLog.details;
                    }
                  })()}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
