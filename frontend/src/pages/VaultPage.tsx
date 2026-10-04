import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Edit2, ExternalLink, Eye, EyeOff, KeyRound, Lock, Plus, Server, ShieldAlert, Store, Trash2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { FilterBar, FilterSelect } from '@/components/ui/FilterBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { VaultFormDrawer } from '@/components/vault/VaultFormDrawer';
import { useAuth } from '@/hooks/useAuth';
import { useConfirm } from '@/hooks/useConfirm';
import { copyToClipboard } from '@/lib/clipboard';
import { formatDate } from '@/lib/format';
import { vaultService } from '@/services/vaultService';
import type { VaultEntry, VaultEntryInput, VaultSecret } from '@/types/vault';

/** Quanto tempo a senha revelada fica visível na tela. */
const REVEAL_SECONDS = 30;

const readEquipmentFilter = () => {
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const id = Number(params.get('equipment_id'));
  return Number.isInteger(id) && id > 0 ? id : undefined;
};

/** Cofre de Senhas: credenciais de equipamentos e sistemas, cifradas; toda revelação é auditada. */
export const VaultPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { success, error: toastError } = useToast();
  const confirm = useConfirm();
  const canWrite = hasPermission('vault:write');

  const [entries, setEntries] = useState<VaultEntry[] | null>(null);
  const [configured, setConfigured] = useState(true);
  const [search, setSearch] = useState('');
  const [visibility, setVisibility] = useState('all');
  const [equipmentFilter, setEquipmentFilter] = useState(readEquipmentFilter);
  const [revealed, setRevealed] = useState<{ id: number; secret: VaultSecret } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VaultEntry | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const [status, list] = await Promise.all([
        vaultService.status(),
        vaultService.list({
          search: search || undefined,
          visibility: visibility !== 'all' ? visibility : undefined,
          equipment_id: equipmentFilter,
        }),
      ]);
      setConfigured(status.configured);
      setEntries(list);
    } catch (err) {
      toastError('Erro ao carregar o cofre', err instanceof Error ? err.message : '');
      setEntries([]);
    }
  }, [search, visibility, equipmentFilter, toastError]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!cancelled) await load();
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [load]);

  // A senha revelada some sozinha e também ao sair da tela.
  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const reveal = async (entry: VaultEntry) => {
    const secret = await vaultService.reveal(entry.id);
    clearTimeout(hideTimer.current);
    setRevealed({ id: entry.id, secret });
    hideTimer.current = setTimeout(() => setRevealed(null), REVEAL_SECONDS * 1000);
    return secret;
  };

  const copy = async (entry: VaultEntry, field: 'username' | 'password') => {
    try {
      const secret = revealed?.id === entry.id ? revealed.secret : await reveal(entry);
      const value = secret[field];
      if (!value) return toastError('Sem usuário', 'Este registro não tem usuário cadastrado.');
      await copyToClipboard(value);
      success(field === 'password' ? 'Senha copiada' : 'Usuário copiado', 'O acesso fica registrado na auditoria.');
    } catch (err) {
      toastError('Não foi possível copiar', err instanceof Error ? err.message : '');
    }
  };

  const toggleReveal = async (entry: VaultEntry) => {
    if (revealed?.id === entry.id) {
      setRevealed(null);
      return;
    }
    try {
      await reveal(entry);
    } catch (err) {
      toastError('Não foi possível mostrar', err instanceof Error ? err.message : '');
    }
  };

  const save = async (data: VaultEntryInput) => {
    if (editing) {
      await vaultService.update(editing.id, data);
      success('Senha atualizada', data.title);
    } else {
      await vaultService.create(data);
      success('Senha guardada', data.title);
    }
    setRevealed(null);
    load();
  };

  const remove = async (entry: VaultEntry) => {
    if (!(await confirm({ title: `Excluir "${entry.title}"?`, description: 'A credencial será apagada do cofre.' }))) return;
    try {
      await vaultService.remove(entry.id);
      success('Senha excluída', entry.title);
      load();
    } catch (err) {
      toastError('Não foi possível excluir', err instanceof Error ? err.message : '');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={KeyRound}
        title="Senhas"
        description="Credenciais de equipamentos e sistemas, guardadas com criptografia. Cada visualização fica registrada."
      >
        {canWrite && configured && (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Nova senha
          </Button>
        )}
      </PageHeader>

      {!configured && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-500" />
          <p>
            O cofre ainda não foi configurado no servidor (falta a chave <code>CENTRAL_VAULT_KEY</code>). Fale com o administrador.
          </p>
        </div>
      )}

      <FilterBar search={search} onSearch={setSearch} placeholder="Buscar por nome, endereço ou categoria...">
        <FilterSelect
          label="Quem vê"
          value={visibility}
          onChange={setVisibility}
          options={[
            { value: 'equipe', label: 'Equipe' },
            { value: 'pessoal', label: 'Só eu' },
          ]}
        />
        {equipmentFilter && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs"
            onClick={() => {
              setEquipmentFilter(undefined);
              window.history.replaceState(null, '', '#vault');
            }}
          >
            Filtrando por equipamento · limpar
          </Button>
        )}
      </FilterBar>

      {entries === null ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title={search || visibility !== 'all' || equipmentFilter ? 'Nada encontrado com esses filtros.' : 'Nenhuma senha guardada ainda.'}
          description="Guarde aqui senhas de switches, roteadores, servidores, Wi-Fi e sistemas — em vez de planilhas e anotações."
        />
      ) : (
        <ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 bg-card">
          {entries.map((entry) => {
            const open = revealed?.id === entry.id ? revealed.secret : null;
            return (
              <li key={entry.id} className="space-y-2 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold text-foreground">
                      {entry.title}
                      {entry.visibility === 'pessoal' ? (
                        <Badge variant="outline" className="h-5 gap-1 text-[10px]">
                          <Lock className="h-3 w-3" /> Só eu
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="h-5 gap-1 text-[10px]">
                          <Users className="h-3 w-3" /> Equipe
                        </Badge>
                      )}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      {entry.system_url && (
                        /^https?:\/\//.test(entry.system_url) ? (
                          <a href={entry.system_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                            <ExternalLink className="h-3 w-3" /> {entry.system_url}
                          </a>
                        ) : (
                          <span className="font-mono">{entry.system_url}</span>
                        )
                      )}
                      {entry.category && <span>{entry.category}</span>}
                      {entry.store_name && (
                        <span className="flex items-center gap-1">
                          <Store className="h-3 w-3" /> {entry.store_name}
                        </span>
                      )}
                      {entry.equipment_name && entry.equipment_id && (
                        <a href={`#equipment?id=${entry.equipment_id}`} className="flex items-center gap-1 hover:text-primary hover:underline">
                          <Server className="h-3 w-3" /> {entry.equipment_name}
                        </a>
                      )}
                      <span>
                        por {entry.owner?.full_name || entry.owner?.username} · {formatDate(entry.updated_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => copy(entry, 'username')}>
                      <Copy className="h-3.5 w-3.5" /> Usuário
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => copy(entry, 'password')}>
                      <Copy className="h-3.5 w-3.5" /> Senha
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleReveal(entry)} aria-label={open ? 'Ocultar' : 'Mostrar'}>
                      {open ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    {entry.can_edit && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditing(entry);
                            setFormOpen(true);
                          }}
                          aria-label="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-destructive" onClick={() => remove(entry)} aria-label="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {open && (
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3 font-mono text-xs">
                    <p>
                      <span className="text-muted-foreground">usuário: </span>
                      {open.username || '—'}
                    </p>
                    <p>
                      <span className="text-muted-foreground">senha: </span>
                      {open.password}
                    </p>
                    {open.notes && <p className="mt-1 whitespace-pre-wrap font-sans text-muted-foreground">{open.notes}</p>}
                    <p className="mt-2 font-sans text-[10px] text-muted-foreground">Some em {REVEAL_SECONDS} segundos.</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <VaultFormDrawer open={formOpen} onOpenChange={setFormOpen} entry={editing} onSubmit={save} />
    </div>
  );
};
