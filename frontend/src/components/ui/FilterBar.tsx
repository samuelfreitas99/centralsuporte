import React, { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  /** Valor da busca já aplicado (vem do estado da página). */
  search: string;
  /** Chamado ~350 ms depois que o usuário para de digitar. */
  onSearch: (value: string) => void;
  placeholder: string;
  /** Filtros extras à direita (FilterSelect, botões). */
  children?: React.ReactNode;
  /** Sem borda/fundo próprios (quando a barra já está dentro de um card). */
  bare?: boolean;
}

const SEARCH_DEBOUNCE_MS = 350;

/** Barra de busca + filtros padrão das listas. A busca só dispara quando o usuário para de digitar. */
export const FilterBar: React.FC<FilterBarProps> = ({ search, onSearch, placeholder, children, bare = false }) => {
  const [text, setText] = useState(search);
  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  // Sincroniza quando a página muda a busca por fora (ex.: deep link, botão "limpar").
  const [lastSearch, setLastSearch] = useState(search);
  if (search !== lastSearch) {
    setLastSearch(search);
    setText(search);
  }

  useEffect(() => {
    if (text === search) return;
    const handle = setTimeout(() => onSearchRef.current(text), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [text, search]);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        !bare && 'rounded-xl border border-border/60 bg-card p-3 shadow-sm'
      )}
    >
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          aria-label="Buscar"
          className="h-9 w-full rounded-md border border-border/60 bg-background/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
};

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  /** Rótulo acessível e texto da opção "todos" (ex.: "Status" → "Todos os status"). */
  label: string;
  options: { value: string; label: string }[];
  className?: string;
}

/** Seletor de filtro padrão; o valor "all" significa "sem filtro". */
export const FilterSelect: React.FC<FilterSelectProps> = ({ value, onChange, label, options, className }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    aria-label={label}
    className={cn(
      'h-9 cursor-pointer rounded-md border border-border/60 bg-background/50 px-3 text-xs font-medium text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      className
    )}
  >
    <option value="all">{label}: todos</option>
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);
