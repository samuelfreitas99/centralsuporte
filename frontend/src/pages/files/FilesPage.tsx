import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { attachmentService } from '@/services/attachmentService';
import type { AttachmentItem } from '@/types/attachment';
import { useToast } from '@/components/ui/Toast';
import { FolderOpen, Loader2 } from 'lucide-react';
import { FileToolbar } from './FileToolbar';
import { FileCard } from './FileCard';
import { FileListItem } from './FileListItem';
import { FileEmptyState } from './FileEmptyState';

export const FilesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  const [search, setSearch] = useState('');
  const [mimeCategory, setMimeCategory] = useState<string>('all');
  const [entityType, setEntityType] = useState<string>('all');

  const canRead = hasPermission('attachment:read');
  const canDelete = hasPermission('attachment:delete');

  const loadAttachments = async () => {
    if (!canRead) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const qEntity = entityType !== 'all' ? entityType : undefined;
      const qMime = mimeCategory !== 'all' ? mimeCategory : undefined;
      const data = await attachmentService.getAttachments(qEntity, undefined, search, qMime, undefined, 0, 50);
      setAttachments(data);
    } catch (err) {
      showToast('Erro ao carregar arquivos', { type: 'error', message: err instanceof Error ? err.message : 'Erro desconhecido' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadAttachments();
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [search, mimeCategory, entityType, canRead]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Deseja realmente excluir este arquivo? (Isso não poderá ser desfeito na interface)')) {
      return;
    }
    try {
      await attachmentService.deleteAttachment(id);
      showToast('Arquivo excluído com sucesso', { type: 'success' });
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      showToast('Erro ao excluir', { type: 'error', message: err instanceof Error ? err.message : 'Desconhecido' });
    }
  };

  const handleDownload = async (id: number, filename: string) => {
    try {
      await attachmentService.downloadAttachment(id, filename);
    } catch (err) {
      showToast('Erro ao baixar', { type: 'error', message: err instanceof Error ? err.message : 'Desconhecido' });
    }
  };

  const handlePreview = async (id: number, mimeType: string) => {
    if (mimeType.startsWith('image/') || mimeType === 'application/pdf' || mimeType.startsWith('text/')) {
      try {
        const url = await attachmentService.fetchPreviewBlobUrl(id);
        window.open(url, '_blank');
      } catch (err) {
        showToast('Erro ao visualizar', { type: 'error', message: err instanceof Error ? err.message : 'Desconhecido' });
      }
    } else {
      showToast('Aviso', { type: 'warning', message: 'Este tipo de arquivo não suporta visualização nativa. Faça o download.' });
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setMimeCategory('all');
    setEntityType('all');
  };

  if (!canRead) {
    return (
      <div className="flex h-full items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">Acesso Negado</h2>
          <p className="text-muted-foreground max-w-sm">
            Você não tem permissão para visualizar a central de arquivos. Solicite acesso ao administrador.
          </p>
        </div>
      </div>
    );
  }

  const isSearchActive = search !== '' || mimeCategory !== 'all' || entityType !== 'all';

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <FolderOpen className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
          Central de Arquivos
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Acesse os documentos, imagens e manuais aos quais você tem permissão.
        </p>
      </div>

      {/* Toolbar */}
      <FileToolbar
        search={search}
        setSearch={setSearch}
        mimeCategory={mimeCategory}
        setMimeCategory={setMimeCategory}
        entityType={entityType}
        setEntityType={setEntityType}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Content Area */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : attachments.length === 0 ? (
        <FileEmptyState isSearchActive={isSearchActive} onClearFilters={handleClearFilters} />
      ) : (
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6" 
            : "flex flex-col gap-3 sm:gap-4"
        }>
          {attachments.map((file) => (
            viewMode === 'grid' ? (
              <FileCard 
                key={file.id} 
                file={file} 
                canDelete={canDelete}
                onPreview={handlePreview}
                onDownload={handleDownload}
                onDelete={handleDelete}
              />
            ) : (
              <FileListItem 
                key={file.id} 
                file={file} 
                canDelete={canDelete}
                onPreview={handlePreview}
                onDownload={handleDownload}
                onDelete={handleDelete}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
};
