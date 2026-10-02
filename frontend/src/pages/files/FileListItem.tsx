import React from 'react';
import type { AttachmentItem } from '@/types/attachment';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Trash2 } from 'lucide-react';
import { formatSize, formatEntityName, getFileIcon } from './utils';

interface FileListItemProps {
  file: AttachmentItem;
  canDelete: boolean;
  onClick: () => void;
  onDownload: (id: number, filename: string) => void;
  onDelete: (id: number) => void;
}

export const FileListItem: React.FC<FileListItemProps> = ({ file, canDelete, onClick, onDownload, onDelete }) => {
  return (
    <Card 
      className="overflow-hidden border-border/40 bg-card hover:bg-card/80 transition-colors group cursor-pointer"
      onClick={onClick}
    >
      <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        
        {/* Ícone, Nome e Meta */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2.5 bg-primary/5 rounded-xl shrink-0 group-hover:scale-105 transition-transform hidden sm:flex">
            {getFileIcon(file.mime_type)}
          </div>
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <h4 className="text-sm font-semibold truncate" title={file.original_filename}>
              {file.original_filename}
            </h4>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
              <span className="font-medium text-foreground/70">{formatSize(file.file_size)}</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">{new Date(file.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Informações da Origem e Mobile Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 sm:ml-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1 sm:items-end">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:block">Origem</span>
              <Badge variant="secondary" className="w-fit text-xs font-medium">
                {formatEntityName(file.entity_type)} #{file.entity_id}
              </Badge>
            </div>
            
            {file.uploader && (
              <div className="flex-col gap-1 sm:items-end hidden md:flex min-w-[120px]">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Enviado por</span>
                <span className="text-xs truncate max-w-[120px] text-muted-foreground">{file.uploader.username}</span>
              </div>
            )}
          </div>

          {/* Ações (Mobile & Desktop) */}
          <div className="flex items-center gap-1 border-l border-border/40 pl-4 ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); onDownload(file.id, file.original_filename); }}
              title="Baixar arquivo"
            >
              <Download className="h-4 w-4" />
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground z-10"
                onClick={(e) => { e.stopPropagation(); onDelete(file.id); }}
                title="Excluir arquivo"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
