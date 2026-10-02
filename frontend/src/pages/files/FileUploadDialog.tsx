import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, File as FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { attachmentService } from '@/services/attachmentService';
import { formatSize } from './utils';

interface FileUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface FileItem {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  errorMsg?: string;
}

export const FileUploadDialog: React.FC<FileUploadDialogProps> = ({ isOpen, onClose, onUploadSuccess }) => {
  const [entityType, setEntityType] = useState<string>('');
  const [entityId, setEntityId] = useState<string>('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).substring(7),
        file,
        status: 'idle' as UploadStatus,
        progress: 0,
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const startUpload = async () => {
    if (!entityType || !entityId) {
      alert('Selecione a origem (Tipo e ID).');
      return;
    }

    let hasSuccess = false;
    
    // Process one by one or in parallel. Let's do sequential for simple feedback
    for (const item of files) {
      if (item.status === 'success') continue;
      
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' } : f));
      
      try {
        await attachmentService.uploadAttachment({
          file: item.file,
          entity_type: entityType,
          entity_id: parseInt(entityId, 10),
        });
        
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'success', progress: 100 } : f));
        hasSuccess = true;
      } catch (err) {
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', errorMsg: err instanceof Error ? err.message : 'Erro' } : f));
      }
    }

    if (hasSuccess) {
      onUploadSuccess();
    }
  };

  const isUploading = files.some(f => f.status === 'uploading');
  const allCompleted = files.length > 0 && files.every(f => f.status === 'success' || f.status === 'error');

  const handleClose = () => {
    if (isUploading) return; // Prevent close during upload
    setEntityType('');
    setEntityId('');
    setFiles([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-lg rounded-xl shadow-2xl border border-border/40 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border/40 flex justify-between items-center bg-muted/20">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Adicionar arquivos
          </h2>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleClose} disabled={isUploading}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">1. Onde deseja vincular?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Tipo de Origem</label>
                <Select value={entityType} onChange={(e) => setEntityType(e.target.value)} disabled={isUploading}>
                  <option value="" disabled>Selecione...</option>
                  <option value="project">Projeto</option>
                  <option value="task">Tarefa</option>
                  <option value="attendance">Atendimento</option>
                  <option value="maintenance">Manutenção</option>
                  <option value="equipment">Equipamento</option>
                  <option value="knowledge">Conhecimento</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">ID da Entidade</label>
                <Input 
                  type="number" 
                  placeholder="Ex: 123" 
                  value={entityId} 
                  onChange={(e) => setEntityId(e.target.value)}
                  disabled={isUploading || !entityType}
                />
              </div>
            </div>
            {/* Contextual search/selection limitation disclaimer */}
            <p className="text-[10px] text-muted-foreground">
              A busca avançada de contexto está planejada para evolução futura. Por enquanto, informe o ID.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">2. Selecionar Arquivos</h3>
            
            <input 
              type="file" 
              multiple 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              disabled={isUploading}
            />
            
            <Button 
              type="button"
              variant="outline" 
              className="w-full border-dashed border-2 py-8 bg-muted/5 hover:bg-muted/20 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span>Clique para selecionar múltiplos arquivos</span>
              </div>
            </Button>
            
            {files.length > 0 && (
              <div className="bg-muted/10 border border-border/40 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center text-xs font-medium text-muted-foreground mb-3">
                  <span>{files.length} arquivo(s) selecionado(s)</span>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {files.map(f => (
                    <div key={f.id} className="flex items-center justify-between p-2 rounded-md bg-background border border-border/40 text-sm gap-2">
                      <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                        <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate" title={f.file.name}>{f.file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{formatSize(f.file.size)}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {f.status === 'idle' && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveFile(f.id)} disabled={isUploading}>
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                        {f.status === 'uploading' && <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
                        {f.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {f.status === 'error' && <span title={f.errorMsg}><AlertCircle className="h-4 w-4 text-destructive" /></span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border/40 bg-muted/20 flex justify-end gap-3">
          <Button variant="ghost" onClick={handleClose} disabled={isUploading}>
            {allCompleted ? 'Fechar' : 'Cancelar'}
          </Button>
          <Button 
            onClick={startUpload} 
            disabled={isUploading || files.length === 0 || !entityType || !entityId || files.every(f => f.status === 'success')}
          >
            {isUploading ? 'Enviando...' : 'Enviar arquivos'}
          </Button>
        </div>
      </div>
    </div>
  );
};
