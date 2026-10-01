import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Paperclip,
  UploadCloud,
  File,
  FileText,
  Image as ImageIcon,
  FileArchive,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  X,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/Toast';
import { attachmentService } from '@/services/attachmentService';
import type { AttachmentItem, AttachmentEntityType } from '@/types/attachment';

interface AttachmentManagerProps {
  entityType: AttachmentEntityType | string;
  entityId: number;
  title?: string;
  readOnly?: boolean;
  compact?: boolean;
  onAttachmentCountChange?: (count: number) => void;
}

export const AttachmentManager: React.FC<AttachmentManagerProps> = ({
  entityType,
  entityId,
  title = 'Arquivos & Anexos',
  readOnly = false,
  compact = false,
  onAttachmentCountChange,
}) => {
  const { success, error: toastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Upload form states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Preview Modal states
  const [previewItem, setPreviewItem] = useState<AttachmentItem | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Load attachments
  const loadAttachments = useCallback(async () => {
    if (!entityId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await attachmentService.getAttachments(entityType, entityId);
      setAttachments(data);
      onAttachmentCountChange?.(data.length);
    } catch (err: any) {
      setErrorMessage(err.message || 'Não foi possível carregar os anexos.');
    } finally {
      setIsLoading(false);
    }
  }, [entityType, entityId, onAttachmentCountChange]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  // File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!readOnly) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (readOnly) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // Upload handler
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    // Check size limit: 25MB
    if (selectedFile.size > 25 * 1024 * 1024) {
      toastError('Arquivo Muito Grande', 'O tamanho máximo permitido por arquivo é de 25MB.');
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await attachmentService.uploadAttachment({
        file: selectedFile,
        entity_type: entityType,
        entity_id: entityId,
        description: description.trim() || undefined,
      });

      setAttachments((prev) => [uploaded, ...prev]);
      onAttachmentCountChange?.(attachments.length + 1);
      setSelectedFile(null);
      setDescription('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      success('Arquivo Anexado', `"${uploaded.original_filename}" salvo com sucesso.`);
    } catch (err: any) {
      toastError('Erro no Envio', err.message || 'Falha ao salvar anexo no servidor.');
    } finally {
      setIsUploading(false);
    }
  };

  // Delete handler
  const handleDelete = async (item: AttachmentItem) => {
    if (!window.confirm(`Tem certeza que deseja excluir o anexo "${item.original_filename}"?`)) {
      return;
    }

    try {
      await attachmentService.deleteAttachment(item.id);
      const remaining = attachments.filter((a) => a.id !== item.id);
      setAttachments(remaining);
      onAttachmentCountChange?.(remaining.length);
      success('Anexo Excluído', `"${item.original_filename}" foi removido do servidor.`);
    } catch {
      toastError('Erro ao Excluir', 'Não foi possível remover o arquivo.');
    }
  };

  // Download handler
  const handleDownload = async (item: AttachmentItem) => {
    try {
      await attachmentService.downloadAttachment(item.id, item.original_filename);
    } catch {
      toastError('Erro no Download', 'Falha ao baixar o arquivo.');
    }
  };

  // Preview handler
  const handleOpenPreview = async (item: AttachmentItem) => {
    setPreviewItem(item);
    setIsPreviewLoading(true);
    try {
      const url = await attachmentService.fetchPreviewBlobUrl(item.id);
      setPreviewBlobUrl(url);
    } catch {
      toastError('Preview Indisponível', 'Não foi possível carregar a pré-visualização.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewBlobUrl) {
      window.URL.revokeObjectURL(previewBlobUrl);
    }
    setPreviewBlobUrl(null);
    setPreviewItem(null);
  };

  // Helper: Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Helper: File Icon based on extension / mime
  const getFileIcon = (mimeType: string, filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    }
    if (mimeType === 'application/pdf' || ext === 'pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext || '')) {
      return <FileArchive className="h-5 w-5 text-amber-500" />;
    }
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const isPreviewable = (item: AttachmentItem): boolean => {
    const ext = item.original_filename.split('.').pop()?.toLowerCase() || '';
    return (
      item.mime_type.startsWith('image/') ||
      item.mime_type === 'application/pdf' ||
      ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'].includes(ext)
    );
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-1 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground font-heading">{title}</h4>
          <span className="text-xs text-muted-foreground font-mono">({attachments.length})</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={loadAttachments}
          disabled={isLoading}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
          title="Recarregar Anexos"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="sr-only">Atualizar</span>
        </Button>
      </div>

      {/* Upload Zone (if not readOnly) */}
      {!readOnly && (
        <form onSubmit={handleUpload} className="space-y-2.5">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl text-center transition-all ${
              compact ? 'p-2.5' : 'p-4'
            } ${
              isDragOver
                ? 'border-primary bg-primary/5 scale-[1.005]'
                : 'border-border/80 hover:border-border bg-muted/20'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              id={`attachment-input-${entityType}-${entityId}`}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp,.json,.xml,.log,.yaml,.yml,.zip"
            />

            {!selectedFile ? (
              <label
                htmlFor={`attachment-input-${entityType}-${entityId}`}
                className="flex flex-col items-center justify-center gap-1.5 cursor-pointer"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-primary hover:underline">
                    Clique para selecionar
                  </span>{' '}
                  <span className="text-muted-foreground">ou arraste arquivos até aqui</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Documentos, Imagens, Textos ou Arquivos Compactados (máx. 25MB)
                </p>
              </label>
            ) : (
              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border/70">
                  <div className="flex items-center gap-2 min-w-0">
                    {getFileIcon(selectedFile.type, selectedFile.name)}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remover</span>
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Descrição opcional do anexo (ex: Print do erro de rede)..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-8 text-xs flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={isUploading}
                    size="sm"
                    className="h-8 px-4 text-xs font-medium cursor-pointer"
                  >
                    {isUploading ? 'Enviando...' : 'Salvar Anexo'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </form>
      )}

      {/* 4 STATES: Loading Skeletons */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : errorMessage ? (
        /* Error State */
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-center text-xs text-destructive flex items-center justify-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{errorMessage}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadAttachments}
            className="h-6 px-2 text-xs text-destructive hover:bg-destructive/20 cursor-pointer"
          >
            Tentar novamente
          </Button>
        </div>
      ) : attachments.length === 0 ? (
        /* Empty State */
        <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-muted-foreground">
          <Paperclip className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-xs font-medium text-foreground">Nenhum anexo registrado</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Adicione fotos, notas fiscais, manuais ou relatórios técnicos associados.
          </p>
        </div>
      ) : (
        /* Ideal State: Attachments List */
        <div className="space-y-2">
          {attachments.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/70 bg-card/60 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                  {getFileIcon(item.mime_type, item.original_filename)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-foreground truncate font-sans">
                      {item.original_filename}
                    </p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 uppercase">
                      {item.original_filename.split('.').pop() || 'FILE'}
                    </Badge>
                  </div>
                  {item.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <span>{formatFileSize(item.file_size)}</span>
                    <span>•</span>
                    <span>{new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
                    {item.uploader && (
                      <>
                        <span>•</span>
                        <span>Por: {item.uploader.username}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {isPreviewable(item) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenPreview(item)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-primary cursor-pointer"
                    title="Visualizar"
                  >
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">Visualizar</span>
                  </Button>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(item)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Baixar arquivo"
                >
                  <Download className="h-4 w-4" />
                  <span className="sr-only">Baixar</span>
                </Button>

                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                    title="Excluir arquivo"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Excluir</span>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Preview Lightbox */}
      <Dialog open={!!previewItem} onOpenChange={(open) => !open && handleClosePreview()}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold truncate font-heading">
              <Eye className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">{previewItem?.original_filename}</span>
            </DialogTitle>
            {previewItem?.description && (
              <DialogDescription className="text-xs">
                {previewItem.description}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-auto min-h-[350px] max-h-[65vh] flex items-center justify-center bg-black/40 rounded-xl p-2 border border-border/60">
            {isPreviewLoading ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <span>Carregando visualização...</span>
              </div>
            ) : previewBlobUrl && previewItem?.mime_type.startsWith('image/') ? (
              <img
                src={previewBlobUrl}
                alt={previewItem.original_filename}
                className="max-h-[60vh] max-w-full object-contain rounded-lg"
              />
            ) : previewBlobUrl && previewItem?.mime_type === 'application/pdf' ? (
              <iframe
                src={previewBlobUrl}
                title={previewItem.original_filename}
                className="w-full h-[60vh] rounded-lg border-0"
              />
            ) : (
              <div className="text-center text-xs text-muted-foreground p-6">
                <File className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Visualização direta não disponível para este tipo de arquivo.</p>
                {previewItem && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(previewItem)}
                    className="mt-3 text-xs gap-1.5 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Baixar para abrir no seu computador
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
