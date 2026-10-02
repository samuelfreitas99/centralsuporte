import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, File as FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AttachmentItem } from '@/types/attachment';
import { attachmentService } from '@/services/attachmentService';
import { formatSize, getAttachmentContextLabel, getFileIcon } from './utils';
import { Badge } from '@/components/ui/badge';

interface FileViewerProps {
  files: AttachmentItem[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
  onDownload: (id: number, filename: string) => void;
}

export const FileViewer: React.FC<FileViewerProps> = ({
  files,
  currentIndex,
  isOpen,
  onClose,
  onChangeIndex,
  onDownload,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  const currentFile = files[currentIndex];
  const isImage = currentFile?.mime_type.startsWith('image/');
  const isPdf = currentFile?.mime_type === 'application/pdf';

  useEffect(() => {
    if (!isOpen || !currentFile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, files.length]);

  useEffect(() => {
    let isMounted = true;
    
    if (!isOpen || !currentFile || (!isImage && !isPdf)) {
      setBlobUrl(null);
      return;
    }

    setIsLoading(true);
    setError(false);
    
    attachmentService.fetchPreviewBlobUrl(currentFile.id)
      .then((url) => {
        if (isMounted) {
          setBlobUrl(url);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError(true);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      // We can't revoke blobUrl here cleanly without a ref because it might be from a previous effect,
      // but actually React effects cleanup function captures the closure scope variables, so we need to capture `url`.
    };
  }, [isOpen, currentFile]);

  // Clean up blob urls correctly
  useEffect(() => {
    return () => {
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  if (!isOpen || !currentFile) return null;

  const handleNext = () => {
    if (currentIndex < files.length - 1) onChangeIndex(currentIndex + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) onChangeIndex(currentIndex - 1);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between text-white z-10 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
          <span className="text-sm font-medium">
            {currentIndex + 1} / {files.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={() => onDownload(currentFile.id, currentFile.original_filename)}
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar
          </Button>
        </div>
      </div>

      {/* Navigation Areas */}
      {currentIndex > 0 && (
        <button 
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors z-10 hidden sm:block"
          onClick={handlePrev}
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}

      {currentIndex < files.length - 1 && (
        <button 
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors z-10 hidden sm:block"
          onClick={handleNext}
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      {/* Main Content Area (Swipeable for mobile can be added via simple touch events) */}
      <div 
        className="flex-1 w-full h-full flex flex-col items-center justify-center p-4 sm:p-12 relative"
        onTouchStart={(e) => {
          // Simple swipe logic
          const touch = e.touches[0];
          const startX = touch.clientX;
          
          const handleTouchEnd = (eEnd: TouchEvent) => {
            const endX = eEnd.changedTouches[0].clientX;
            const diff = startX - endX;
            if (diff > 50) handleNext();
            else if (diff < -50) handlePrev();
            window.removeEventListener('touchend', handleTouchEnd);
          };
          window.addEventListener('touchend', handleTouchEnd);
        }}
      >
        {isLoading ? (
          <div className="text-white flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/20 border-t-white"></div>
          </div>
        ) : error ? (
          <div className="text-white flex flex-col items-center gap-4">
            <FileIcon className="h-16 w-16 opacity-50" />
            <p>Não foi possível carregar o preview</p>
          </div>
        ) : isImage && blobUrl ? (
          <img
            src={blobUrl}
            alt={currentFile.original_filename}
            className="max-w-full max-h-[75vh] object-contain select-none"
          />
        ) : isPdf && blobUrl ? (
          <iframe
            src={blobUrl}
            className="w-full h-[75vh] max-w-5xl bg-white rounded-md"
            title="PDF Preview"
          />
        ) : (
          <div className="bg-card text-card-foreground p-8 rounded-xl max-w-md w-full shadow-2xl border border-border/40">
            <div className="flex justify-center mb-6">
              {getFileIcon(currentFile.mime_type, "h-20 w-20")}
            </div>
            <h3 className="text-xl font-bold text-center mb-2 break-all">{currentFile.original_filename}</h3>
            
            <div className="space-y-4 mt-6">
              <div className="flex justify-between items-center border-b border-border/40 pb-2">
                <span className="text-muted-foreground text-sm">Tipo</span>
                <span className="font-medium text-sm">{currentFile.mime_type}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/40 pb-2">
                <span className="text-muted-foreground text-sm">Tamanho</span>
                <span className="font-medium text-sm">{formatSize(currentFile.file_size)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/40 pb-2">
                <span className="text-muted-foreground text-sm">Data</span>
                <span className="font-medium text-sm">{new Date(currentFile.created_at).toLocaleDateString()}</span>
              </div>
              {currentFile.uploader && (
                <div className="flex justify-between items-center border-b border-border/40 pb-2">
                  <span className="text-muted-foreground text-sm">Uploader</span>
                  <span className="font-medium text-sm truncate max-w-[150px]">{currentFile.uploader.username}</span>
                </div>
              )}
            </div>
            <div className="mt-8 flex justify-center">
               <Button onClick={() => onDownload(currentFile.id, currentFile.original_filename)} className="w-full">
                 <Download className="h-4 w-4 mr-2" />
                 Baixar Arquivo
               </Button>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-2 pointer-events-none">
           <h4 className="text-white font-medium text-lg drop-shadow-md truncate max-w-[90vw]" title={currentFile.original_filename}>
             {currentFile.original_filename}
           </h4>
           <Badge variant="secondary" className="bg-white/20 text-white border-none pointer-events-auto backdrop-blur-md">
             {getAttachmentContextLabel(currentFile)}
           </Badge>
        </div>
      </div>
    </div>
  );
};
