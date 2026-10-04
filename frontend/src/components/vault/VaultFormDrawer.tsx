import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { EquipmentPicker } from '@/components/infrastructure/EquipmentPicker';
import { infrastructureService } from '@/services/infrastructureService';
import type { StoreItem } from '@/types/infrastructure';
import type { VaultEntry, VaultEntryInput, VaultVisibility } from '@/types/vault';

interface VaultFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Registro em edição (sem os segredos, que não vêm na listagem). */
  entry: VaultEntry | null;
  onSubmit: (data: VaultEntryInput) => Promise<void>;
}

const EMPTY: VaultEntryInput = {
  title: '',
  system_url: '',
  category: '',
  visibility: 'equipe',
  store_id: null,
  equipment_id: null,
  username: '',
  password: '',
  notes: '',
};

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*-_';

/** Senha aleatória forte, gerada no navegador com crypto.getRandomValues. */
const generatePassword = (length = 20) => {
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values, (v) => ALPHABET[v % ALPHABET.length]).join('');
};

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="block space-y-1.5">
    <span className="text-xs font-semibold text-foreground">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
  </label>
);

export const VaultFormDrawer: React.FC<VaultFormDrawerProps> = ({ open, onOpenChange, entry, onSubmit }) => {
  const editing = Boolean(entry);
  const [form, setForm] = useState<VaultEntryInput>(EMPTY);
  const [equipmentName, setEquipmentName] = useState('');
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reinicia o formulário sempre que o drawer abre (novo ou edição).
  const [lastKey, setLastKey] = useState('');
  const key = `${open}-${entry?.id ?? 'novo'}`;
  if (key !== lastKey) {
    setLastKey(key);
    if (open) {
      setForm(
        entry
          ? {
              title: entry.title,
              system_url: entry.system_url ?? '',
              category: entry.category ?? '',
              visibility: entry.visibility,
              store_id: entry.store_id ?? null,
              equipment_id: entry.equipment_id ?? null,
            }
          : EMPTY
      );
      setEquipmentName(entry?.equipment_name ?? '');
      setShowPassword(false);
      setError(null);
    }
  }

  useEffect(() => {
    if (!open || stores.length) return;
    let cancelled = false;
    infrastructureService
      .getStores('ativa')
      .then((s) => !cancelled && setStores(s))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, stores.length]);

  const set = <K extends keyof VaultEntryInput>(k: K, v: VaultEntryInput[K]) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing && !form.password) return setError('Informe a senha.');
    setSaving(true);
    setError(null);
    try {
      const data: VaultEntryInput = { ...form };
      // Na edição, campos secretos vazios = manter o valor atual.
      if (editing) {
        if (!data.password) delete data.password;
        if (!data.username) delete data.username;
        if (!data.notes) delete data.notes;
      }
      await onSubmit(data);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" size="lg" className="flex h-full flex-col p-0">
        <DrawerHeader className="border-b border-border/60 px-6 py-5">
          <DrawerTitle className="flex items-center gap-2 text-xl">
            <KeyRound className="h-5 w-5 text-primary" />
            {editing ? 'Editar senha' : 'Nova senha'}
          </DrawerTitle>
          <DrawerDescription>
            Usuário, senha e notas são guardados criptografados. {editing && 'Deixe em branco o que não quiser alterar.'}
          </DrawerDescription>
        </DrawerHeader>

        <form onSubmit={submit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            <Field label="Nome *">
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ex.: Switch core - Matriz" required />
            </Field>
            <Field label="Endereço (URL ou IP)">
              <Input value={form.system_url ?? ''} onChange={(e) => set('system_url', e.target.value)} placeholder="https://10.0.0.2 ou ssh 10.0.0.2" />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Usuário">
                <Input
                  value={form.username ?? ''}
                  onChange={(e) => set('username', e.target.value)}
                  autoComplete="off"
                  placeholder={editing ? '•••••• (manter)' : ''}
                />
              </Field>
              <Field label={editing ? 'Senha' : 'Senha *'}>
                <div className="flex gap-1">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password ?? ''}
                    onChange={(e) => set('password', e.target.value)}
                    autoComplete="new-password"
                    placeholder={editing ? '•••••• (manter)' : ''}
                    className="font-mono"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      set('password', generatePassword());
                      setShowPassword(true);
                    }}
                    aria-label="Gerar senha forte"
                    title="Gerar senha forte"
                  >
                    <Wand2 className="h-4 w-4" />
                  </Button>
                </div>
              </Field>
            </div>
            <Field label="Notas" hint="Ex.: porta, VLAN, quem tem acesso. Também ficam criptografadas.">
              <textarea
                value={form.notes ?? ''}
                onChange={(e) => set('notes', e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-input bg-background p-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Categoria">
                <Input value={form.category ?? ''} onChange={(e) => set('category', e.target.value)} placeholder="Rede, servidor, sistema, Wi-Fi..." />
              </Field>
              <Field label="Loja">
                <select
                  value={form.store_id ?? ''}
                  onChange={(e) => set('store_id', e.target.value ? Number(e.target.value) : null)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">—</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Equipamento (opcional)">
              <EquipmentPicker
                value={{ id: form.equipment_id ?? null, name: equipmentName }}
                onChange={(val) => {
                  set('equipment_id', val.id);
                  setEquipmentName(val.id ? val.name : '');
                }}
              />
            </Field>
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold text-foreground">Quem pode ver</legend>
              {(
                [
                  ['equipe', 'Equipe', 'Todos com acesso ao cofre.'],
                  ['pessoal', 'Só eu', 'Nem administradores veem.'],
                ] as [VaultVisibility, string, string][]
              ).map(([value, label, help]) => (
                <label key={value} className="flex cursor-pointer items-start gap-2 text-sm">
                  <input type="radio" name="visibility" checked={form.visibility === value} onChange={() => set('visibility', value)} className="mt-1" />
                  <span>
                    <span className="font-medium text-foreground">{label}</span>
                    <span className="block text-[11px] text-muted-foreground">{help}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            {error && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {error}
              </p>
            )}
          </div>
          <DrawerFooter className="flex flex-row justify-end gap-2 border-t border-border/60 p-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Guardar senha'}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
};
