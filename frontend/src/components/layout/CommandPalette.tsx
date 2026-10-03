import React, { useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { BookOpen, CheckSquare, CornerDownLeft, Headset, Loader2, Search, Server, Terminal, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchService } from '@/services/searchService';
import type { SearchEntityType, SearchResultItem } from '@/types/search';

const ENTITY_META: Record<SearchEntityType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  attendance: { label: 'Atendimento', icon: Headset, color: 'text-sky-500' },
  knowledge: { label: 'Conhecimento', icon: BookOpen, color: 'text-emerald-500' },
  command: { label: 'Comando', icon: Terminal, color: 'text-purple-500' },
  equipment: { label: 'Equipamento', icon: Server, color: 'text-amber-500' },
  maintenance: { label: 'Manutenção', icon: Wrench, color: 'text-orange-500' },
  task: { label: 'Tarefa', icon: CheckSquare, color: 'text-indigo-500' },
};

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Recebe o destino no formato do hash, ex.: `attendance?id=12`. */
  onNavigate: (target: string) => void;
}

/** Busca global (Ctrl+K). Pesquisa em todos os módulos e abre o item escolhido. */
export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onOpenChange, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState<{ term: string; results: SearchResultItem[] }>({ term: '', results: [] });
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const term = query.trim();
  const loading = term.length >= 2 && searched.term !== term;
  const results = term.length >= 2 ? searched.results : [];

  useEffect(() => {
    if (term.length < 2) return;
    let cancelled = false;
    const handle = setTimeout(async () => {
      let found: SearchResultItem[] = [];
      try {
        found = (await searchService.globalSearch({ q: term, limit: 8 })).results;
      } catch {
        // falha de rede: mostra "nada encontrado"
      }
      if (!cancelled) {
        setSearched({ term, results: found });
        setActiveIndex(0);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [term]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setQuery('');
      setSearched({ term: '', results: [] });
      setActiveIndex(0);
    }
    onOpenChange(next);
  };

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex]);

  const choose = (item: SearchResultItem) => {
    handleOpenChange(false);
    onNavigate(`${item.url_tab}?id=${item.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      choose(results[activeIndex]);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border/70 bg-card shadow-2xl focus:outline-none"
          onKeyDown={handleKeyDown}
        >
          <DialogPrimitive.Title className="sr-only">Busca global</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Pesquise atendimentos, artigos, comandos, equipamentos, manutenções e tarefas.
          </DialogPrimitive.Description>

          <div className="flex items-center gap-2.5 border-b border-border/60 px-4">
            {loading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar chamado OTRS, equipamento, IP, comando, artigo..."
              className="h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              aria-label="Termo de busca"
            />
            <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border/70 bg-muted/40 px-1.5 font-mono text-[10px] text-muted-foreground">
              Esc
            </kbd>
          </div>

          <div ref={listRef} className="max-h-[55vh] overflow-y-auto p-2" role="listbox" aria-label="Resultados">
            {term.length < 2 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                Digite pelo menos 2 caracteres. Use ↑ ↓ para navegar e Enter para abrir.
              </p>
            ) : !loading && results.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                Nada encontrado para “{term}”.
              </p>
            ) : (
              results.map((item, index) => {
                const meta = ENTITY_META[item.entity_type];
                const Icon = meta.icon;
                const active = index === activeIndex;
                return (
                  <button
                    key={`${item.entity_type}-${item.id}`}
                    type="button"
                    data-index={index}
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(item)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer',
                      active ? 'bg-primary/10' : 'hover:bg-muted/50'
                    )}
                  >
                    <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', meta.color)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
                        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {meta.label}
                        </span>
                      </div>
                      {item.snippet && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{item.snippet}</p>
                      )}
                    </div>
                    {active && <CornerDownLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                  </button>
                );
              })
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
