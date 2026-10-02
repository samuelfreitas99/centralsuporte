import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FolderOpen, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileEmptyStateProps {
  isSearchActive: boolean;
  onClearFilters: () => void;
}

export const FileEmptyState: React.FC<FileEmptyStateProps> = ({ isSearchActive, onClearFilters }) => {
  return (
    <Card className="border-border/40 bg-card/20 border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-20 px-4 text-center">
        {isSearchActive ? (
          <>
            <div className="p-4 rounded-full bg-muted/30 mb-4">
              <SearchX className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground max-w-sm mb-6 text-sm">
              Não encontramos nenhum arquivo que corresponda à sua busca ou filtros. Tente usar termos diferentes.
            </p>
            <Button variant="outline" onClick={onClearFilters}>
              Limpar Filtros
            </Button>
          </>
        ) : (
          <>
            <div className="p-4 rounded-full bg-muted/30 mb-4">
              <FolderOpen className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Sua central está vazia</h3>
            <p className="text-muted-foreground max-w-sm text-sm">
              Ainda não existem documentos vinculados aos projetos, tarefas ou manutenções aos quais você tem acesso, ou você não possui permissões adequadas.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
