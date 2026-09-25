import React from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-xl border border-dashed border-border/70 bg-card/30',
        className
      )}
      {...props}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground mb-3">
        <Icon className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <h3 className="font-heading font-semibold text-foreground text-sm mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground max-w-sm leading-relaxed mb-4">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
