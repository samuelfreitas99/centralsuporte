import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useConfirm } from '@/hooks/useConfirm';
import { useAuth } from '@/hooks/useAuth';
import { attachmentService } from '@/services/attachmentService';
import type { AttachmentItem } from '@/types/attachment';
import { useToast } from '@/components/ui/Toast';
import { FolderOpen, Loader2 } from 'lucide-react';
import { FileToolbar } from './FileToolbar';
import { FileCard } from './FileCard';
import { FileListItem } from './FileListItem';
import { FileEmptyState } from './FileEmptyState';
import { FileViewer } from './FileViewer';
import { FileUploadDialog } from './FileUploadDialog';

export const FilesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [search, setSearch] = useState('');
  const [mimeCategory, setMimeCategory] = useState<string>('all');
  const [entityType, setEntityType] = useState<string>('all');

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);

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

  const confirm = useConfirm();

  const handleDelete = async (id: number) => {
    if (!(await confirm({ title: 'Excluir este arquivo?', description: 'Não é possível desfazer pela interface.' }))) {
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

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
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
    <div className="space-y-6">
      <PageHeader
        icon={FolderOpen}
        title="Arquivos"
        description="Documentos, fotos e manuais da equipe, soltos ou anexados a atendimentos, tarefas e equipamentos."
      />

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
        onOpenUpload={() => setUploadOpen(true)}
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
          {attachments.map((file, index) => (
            viewMode === 'grid' ? (
              <FileCard 
                key={file.id} 
                file={file} 
                canDelete={canDelete}
                onClick={() => openViewer(index)}
                onDownload={handleDownload}
                onDelete={handleDelete}
              />
            ) : (
              <FileListItem 
                key={file.id} 
                file={file} 
                canDelete={canDelete}
                onClick={() => openViewer(index)}
                onDownload={handleDownload}
                onDelete={handleDelete}
              />
            )
          ))}
        </div>
      )}

      {/* Internal Viewer */}
      <FileViewer
        files={attachments}
        currentIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        onChangeIndex={setViewerIndex}
        onDownload={handleDownload}
      />

      <FileUploadDialog
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploadSuccess={() => {
          setUploadOpen(false);
          loadAttachments();
          showToast('Arquivos enviados com sucesso', { type: 'success' });
        }}
      />
    </div>
  );
};
