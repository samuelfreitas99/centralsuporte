import React from 'react';
import type { AttachmentItem } from '@/types/attachment';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Trash2 } from 'lucide-react';
import { FileThumbnail } from './FileThumbnail';
import { formatSize, formatEntityName, getFileIcon } from './utils';

interface FileCardProps {
  file: AttachmentItem;
  canDelete: boolean;
  onClick: () => void;
  onDownload: (id: number, filename: string) => void;
  onDelete: (id: number) => void;
}

export const FileCard: React.FC<FileCardProps> = ({ file, canDelete, onClick, onDownload, onDelete }) => {
  const isImage = file.mime_type.startsWith('image/');

  return (
    <Card 
      className="flex flex-col overflow-hidden border-border/40 bg-card hover:bg-card/80 transition-colors group h-full shadow-sm cursor-pointer" 
      onClick={onClick}
    >
      <div className="relative aspect-video bg-muted/20 border-b border-border/40 flex items-center justify-center overflow-hidden">
        {isImage ? (
          <FileThumbnail attachmentId={file.id} mimeType={file.mime_type} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="p-4 rounded-full bg-background shadow-sm transition-transform group-hover:scale-110">
            {getFileIcon(file.mime_type, "h-10 w-10")}
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="text-sm font-semibold truncate leading-tight" title={file.original_filename}>
            {file.original_filename}
          </h4>
        </div>
        
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-3 text-xs text-muted-foreground">
          <span>{formatSize(file.file_size)}</span>
          <span>•</span>
          <span>{new Date(file.created_at).toLocaleDateString()}</span>
        </div>

        <div className="mt-auto pt-2 flex items-center justify-between border-t border-border/40">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Origem</span>
            <Badge variant="secondary" className="w-fit text-xs font-medium">
              {formatEntityName(file.entity_type)} #{file.entity_id}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
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
