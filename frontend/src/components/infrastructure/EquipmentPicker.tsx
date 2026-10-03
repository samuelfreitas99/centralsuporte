import React, { useEffect, useRef, useState } from 'react';
import { HardDrive, Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { infrastructureService } from '@/services/infrastructureService';
import { equipmentLabel } from '@/lib/equipment';
import type { EquipmentItem } from '@/types/infrastructure';

export interface EquipmentPickerValue {
  /** Equipamento cadastrado vinculado (null = nenhum ou texto livre). */
  id: number | null;
  /** Rótulo exibido; também é o texto livre quando não há equipamento cadastrado. */
  name: string;
}

interface EquipmentPickerProps {
  value: EquipmentPickerValue;
  /** `equipment` vem preenchido quando o usuário escolhe um item cadastrado. */
  onChange: (value: EquipmentPickerValue, equipment?: EquipmentItem) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Seleciona UM equipamento do inventário (busca no servidor por hostname, patrimônio, IP, série).
 * Se o equipamento não estiver cadastrado, permite registrar só o nome digitado.
 */
export const EquipmentPicker: React.FC<EquipmentPickerProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'Buscar por hostname, patrimônio ou IP...',
}) => {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [found, setFound] = useState<{ term: string; items: EquipmentItem[] }>({ term: '', items: [] });
  const containerRef = useRef<HTMLDivElement>(null);

  const query = term.trim();
  const loading = open && query.length >= 2 && found.term !== query;

  useEffect(() => {
    if (!open || query.length < 2) return;
    let cancelled = false;
    const handle = setTimeout(async () => {
      let items: EquipmentItem[] = [];
      try {
        items = (await infrastructureService.getEquipment({ q: query })).slice(0, 8);
      } catch {
        // sem resultados em caso de falha
      }
      if (!cancelled) setFound({ term: query, items });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [open, query]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const select = (eq: EquipmentItem) => {
    onChange({ id: eq.id, name: equipmentLabel(eq) }, eq);
    setTerm('');
    setOpen(false);
  };

  const useFreeText = () => {
    onChange({ id: null, name: query });
    setTerm('');
    setOpen(false);
  };

  if (value.id || value.name) {
    return (
      <div className="flex h-10 items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 text-sm">
        <HardDrive className={cn('h-4 w-4 shrink-0', value.id ? 'text-primary' : 'text-muted-foreground')} />
        <span className="flex-1 truncate text-foreground">{value.name}</span>
        {!value.id && <span className="shrink-0 text-[10px] text-muted-foreground">não cadastrado</span>}
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange({ id: null, name: '' })}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive cursor-pointer"
            aria-label="Remover equipamento"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={term}
        disabled={disabled}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        aria-label="Equipamento"
        className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}

      {open && query.length >= 2 && !loading && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border/70 bg-card shadow-lg">
          {found.items.map((eq) => (
            <button
              key={eq.id}
              type="button"
              onClick={() => select(eq)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted/50 cursor-pointer"
            >
              <HardDrive className="h-4 w-4 shrink-0 text-primary" />
              <span className="flex-1 truncate">{equipmentLabel(eq)}</span>
              <span className="shrink-0 truncate text-[11px] text-muted-foreground max-w-[40%]">
                {[eq.ip_address, eq.store?.name].filter(Boolean).join(' · ')}
              </span>
            </button>
          ))}
          {found.items.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">Nenhum equipamento cadastrado encontrado.</p>
          )}
          <button
            type="button"
            onClick={useFreeText}
            className="w-full border-t border-border/60 px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted/50 cursor-pointer"
          >
            Usar “{query}” sem vincular ao inventário
          </button>
        </div>
      )}
    </div>
  );
};
