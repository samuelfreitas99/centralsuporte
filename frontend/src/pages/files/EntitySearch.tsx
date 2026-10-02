import React, { useState, useEffect } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { searchService } from '@/services/searchService';
import { projectService } from '@/services/projectService';

interface EntitySearchProps {
  entityType: string;
  value: string;
  onChange: (id: string, name: string) => void;
  disabled?: boolean;
}

export const EntitySearch: React.FC<EntitySearchProps> = ({ entityType, value, onChange, disabled }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; title: string; subtitle?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedName, setSelectedName] = useState('');

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (entityType === 'project' && query.length < 2) {
        // wait for input
    } else if (entityType !== 'project' && query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        if (entityType === 'project') {
          const projects = await projectService.getProjects();
          const filtered = projects.filter(p => p.title.toLowerCase().includes(query.toLowerCase()));
          setResults(filtered.map(p => ({
            id: p.id.toString(),
            title: p.title,
            subtitle: p.status.replace('_', ' ')
          })));
        } else {
          // searchService globalSearch expects entity_type types. 
          const res = await searchService.globalSearch({
            q: query,
            entity_type: entityType as any,
            limit: 10
          });
          setResults(res.results.map(r => ({
            id: r.id.toString(),
            title: r.title,
            subtitle: r.snippet
          })));
        }
      } catch (err) {
        console.error('Failed to search entities', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, entityType, open]);

  // Clear selection when entity type changes
  useEffect(() => {
    if (value) {
      onChange('', '');
      setSelectedName('');
      setQuery('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType]);

  if (value && selectedName) {
    return (
      <div className="flex items-center justify-between bg-muted/20 border border-border/40 rounded-md px-3 py-2">
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium truncate">{selectedName}</span>
          <span className="text-[10px] text-muted-foreground uppercase">ID: {value}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange('', '');
            setSelectedName('');
            setQuery('');
          }}
          className="p-1 hover:bg-muted/50 rounded-md text-muted-foreground"
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={`Buscar ${entityType === 'project' ? 'projeto' : entityType}...`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="pl-9"
          disabled={disabled}
        />
        {loading && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {open && query.length >= 2 && (
        <>
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border shadow-lg rounded-md max-h-[250px] overflow-y-auto">
            {results.length === 0 && !loading ? (
              <div className="p-3 text-sm text-center text-muted-foreground">Nenhum resultado encontrado.</div>
            ) : (
              <ul className="py-1">
                {results.map((item) => (
                  <li
                    key={item.id}
                    className="px-3 py-2 hover:bg-muted cursor-pointer flex flex-col"
                    onClick={() => {
                      setSelectedName(item.title);
                      onChange(item.id, item.title);
                      setOpen(false);
                    }}
                  >
                    <span className="text-sm font-medium truncate text-foreground">{item.title}</span>
                    {item.subtitle && <span className="text-xs text-muted-foreground truncate">{item.subtitle}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        </>
      )}
    </div>
  );
};
