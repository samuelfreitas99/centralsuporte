import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Erro ao carregar dados',
  message = 'Ocorreu uma falha ao comunicar com o servidor. Verifique sua conexão e tente novamente.',
  onRetry,
  retryLabel = 'Tentar novamente',
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-6 sm:p-10 rounded-xl border border-destructive/20 bg-destructive/5',
        className
      )}
      {...props}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive mb-3">
        <AlertCircle className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <h3 className="font-heading font-semibold text-foreground text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-sm leading-relaxed mb-4">
        {message}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{retryLabel}</span>
        </Button>
      )}
    </div>
  );
};
