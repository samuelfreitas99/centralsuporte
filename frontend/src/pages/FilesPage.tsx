import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { attachmentService } from '@/services/attachmentService';
import type { AttachmentItem } from '@/types/attachment';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/Toast';
import {
  FileText, Search, Loader2, Download, Eye, Trash2, FolderOpen,
  Image as ImageIcon, FileOutput, File, FileArchive, LayoutGrid, List as ListIcon
} from 'lucide-react';

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

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-6 w-6 text-blue-500" />;
    if (mimeType.startsWith('video/')) return <FileArchive className="h-6 w-6 text-purple-500" />;
    if (mimeType === 'application/pdf') return <FileText className="h-6 w-6 text-red-500" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileOutput className="h-6 w-6 text-green-500" />;
    return <File className="h-6 w-6 text-gray-500" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatEntityName = (type: string) => {
    const map: Record<string, string> = {
      project: 'Projeto',
      task: 'Tarefa',
      attendance: 'Atendimento',
      maintenance: 'Manutenção',
      equipment: 'Equipamento',
      knowledge: 'Conhecimento',
    };
    return map[type] || type;
  };

  if (!canRead) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4">
          <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para visualizar a central de arquivos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <FolderOpen className="h-8 w-8 text-primary" />
          Central de Arquivos
        </h1>
        <p className="text-muted-foreground">
          Acesse os documentos, imagens e manuais aos quais você tem permissão.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border/40 shadow-sm">
        <div className="flex flex-1 w-full gap-4 items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background/50 border-border/40 focus:bg-background transition-colors"
            />
          </div>
          <Select value={mimeCategory} onChange={(e) => setMimeCategory(e.target.value)} className="w-full sm:w-[180px]">
            <option value="all">Todos os tipos</option>
            <option value="image">Imagens</option>
            <option value="application">Documentos/PDFs</option>
            <option value="text">Textos</option>
          </Select>
          <Select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="w-full sm:w-[180px]">
            <option value="all">Todas as origens</option>
            <option value="project">Projetos</option>
            <option value="task">Tarefas</option>
            <option value="attendance">Atendimentos</option>
            <option value="maintenance">Manutenções</option>
            <option value="equipment">Equipamentos</option>
            <option value="knowledge">Base de Conhecimento</option>
          </Select>
        </div>
        
        <div className="flex items-center gap-2 border border-border/40 rounded-md p-1 bg-background/50">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
            aria-label="Modo Lista"
          >
            <ListIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('grid')}
            aria-label="Modo Grade"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : attachments.length === 0 ? (
        <Card className="border-border/40 bg-card/20 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center">
            <FolderOpen className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum arquivo encontrado</h3>
            <p className="text-muted-foreground max-w-sm">
              Não encontramos nenhum anexo que corresponda aos filtros atuais ou você não tem permissões para as entidades pesquisadas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" : "space-y-4"}>
          {attachments.map((file) => (
            <Card key={file.id} className="overflow-hidden border-border/40 bg-card hover:bg-card/80 transition-colors group">
              <div className={viewMode === 'grid' ? "p-5 flex flex-col h-full" : "p-4 flex items-center justify-between gap-4"}>
                <div className={viewMode === 'grid' ? "flex items-start gap-4 mb-4" : "flex items-center gap-4 flex-1 min-w-0"}>
                  <div className="p-3 bg-primary/10 rounded-xl shrink-0 group-hover:scale-110 transition-transform">
                    {getFileIcon(file.mime_type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-medium truncate" title={file.original_filename}>
                      {file.original_filename}
                    </h4>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      <span>{formatSize(file.file_size)}</span>
                      <span>•</span>
                      <span className="truncate">{new Date(file.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className={viewMode === 'grid' ? "mt-auto pt-4 flex flex-col gap-3" : "flex items-center gap-6 shrink-0"}>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Origem</span>
                    <Badge variant="outline" className="w-fit">
                      {formatEntityName(file.entity_type)} #{file.entity_id}
                    </Badge>
                  </div>
                  {viewMode === 'list' && file.uploader && (
                    <div className="flex flex-col gap-1.5 hidden md:flex">
                       <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enviado por</span>
                       <span className="text-sm truncate max-w-[150px]">{file.uploader.username}</span>
                    </div>
                  )}

                  <div className={viewMode === 'grid' ? "flex items-center justify-end gap-2 pt-2 border-t border-border/40 mt-2" : "flex items-center gap-2"}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                      onClick={() => handlePreview(file.id, file.mime_type)}
                      title="Visualizar"
                      aria-label="Visualizar"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                      onClick={() => handleDownload(file.id, file.original_filename)}
                      title="Baixar arquivo"
                      aria-label="Baixar arquivo"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
                        onClick={() => handleDelete(file.id)}
                        title="Excluir arquivo"
                        aria-label="Excluir arquivo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
