import React, { useState, useEffect } from 'react';
import { attachmentService } from '@/services/attachmentService';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileThumbnailProps {
  attachmentId: number;
  mimeType: string;
  className?: string;
}

export const FileThumbnail: React.FC<FileThumbnailProps> = ({ attachmentId, mimeType, className }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let url = '';

    const fetchImage = async () => {
      try {
        url = await attachmentService.fetchPreviewBlobUrl(attachmentId);
        if (isMounted) {
          setBlobUrl(url);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
      if (url) {
        window.URL.revokeObjectURL(url);
      }
    };
  }, [attachmentId]);

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center bg-muted/50 rounded-md", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasError || !blobUrl) {
    return (
      <div className={cn("flex items-center justify-center bg-muted/50 rounded-md", className)}>
        <ImageIcon className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={blobUrl}
      alt="Thumbnail"
      className={cn("object-cover rounded-md", className)}
      loading="lazy"
    />
  );
};
