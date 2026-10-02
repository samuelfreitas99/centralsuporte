import React, { useState } from 'react';
import { Search, LayoutGrid, List as ListIcon, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface FileToolbarProps {
  search: string;
  setSearch: (val: string) => void;
  mimeCategory: string;
  setMimeCategory: (val: string) => void;
  entityType: string;
  setEntityType: (val: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (val: 'grid' | 'list') => void;
}

export const FileToolbar: React.FC<FileToolbarProps> = ({
  search, setSearch, mimeCategory, setMimeCategory, entityType, setEntityType, viewMode, setViewMode
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const activeFiltersCount = (mimeCategory !== 'all' ? 1 : 0) + (entityType !== 'all' ? 1 : 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3 rounded-xl border border-border/40 shadow-sm">
        
        {/* Barra de Busca principal */}
        <div className="flex-1 w-full max-w-lg relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full bg-background/50 border-border/40 focus:bg-background transition-colors h-10"
          />
        </div>

        {/* Desktop Filters & View Toggle */}
        <div className="hidden sm:flex items-center gap-3">
          <Select value={mimeCategory} onChange={(e) => setMimeCategory(e.target.value)} className="w-[160px] h-10">
            <option value="all">Todos os tipos</option>
            <option value="image">Imagens</option>
            <option value="application">Documentos/PDFs</option>
            <option value="text">Textos</option>
          </Select>
          <Select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="w-[160px] h-10">
            <option value="all">Todas as origens</option>
            <option value="project">Projetos</option>
            <option value="task">Tarefas</option>
            <option value="attendance">Atendimentos</option>
            <option value="maintenance">Manutenções</option>
            <option value="equipment">Equipamentos</option>
            <option value="knowledge">Conhecimento</option>
          </Select>
          
          <div className="flex items-center gap-1 border border-border/40 rounded-lg p-1 bg-background/50 h-10">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
              title="Modo Lista"
            >
              <ListIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
              title="Modo Grade"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Filters Toggle */}
        <div className="flex sm:hidden w-full gap-2 relative">
          <Button variant="outline" className="flex-1 justify-between h-10" onClick={() => setIsFilterOpen(!isFilterOpen)}>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </div>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0.5 min-w-[20px] text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          {isFilterOpen && (
            <div className="absolute top-12 left-0 right-0 bg-card border border-border/40 shadow-lg rounded-xl p-4 z-50 animate-in slide-in-from-top-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Arquivo</label>
                  <Select value={mimeCategory} onChange={(e) => setMimeCategory(e.target.value)} className="w-full h-10">
                    <option value="all">Todos os tipos</option>
                    <option value="image">Imagens</option>
                    <option value="application">Documentos/PDFs</option>
                    <option value="text">Textos</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Origem</label>
                  <Select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="w-full h-10">
                    <option value="all">Todas as origens</option>
                    <option value="project">Projetos</option>
                    <option value="task">Tarefas</option>
                    <option value="attendance">Atendimentos</option>
                    <option value="maintenance">Manutenções</option>
                    <option value="equipment">Equipamentos</option>
                    <option value="knowledge">Conhecimento</option>
                  </Select>
                </div>
                <Button 
                  className="w-full" 
                  variant="default"
                  onClick={() => setIsFilterOpen(false)}
                >
                  Aplicar Filtros
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 border border-border/40 rounded-lg p-1 bg-background/50 h-10 shrink-0">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Active Filters Badges */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Filtros ativos:</span>
          {mimeCategory !== 'all' && (
            <Badge variant="outline" className="bg-primary/5 cursor-pointer" onClick={() => setMimeCategory('all')}>
              Tipo: {mimeCategory === 'image' ? 'Imagens' : mimeCategory === 'application' ? 'Docs/PDF' : 'Textos'} ×
            </Badge>
          )}
          {entityType !== 'all' && (
            <Badge variant="outline" className="bg-primary/5 cursor-pointer" onClick={() => setEntityType('all')}>
              Origem: {entityType} ×
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
