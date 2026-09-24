import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { ArrowUpRight } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'warning' | 'primary' | 'success';
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  onClick,
}) => {
  const variantStyles = {
    default: 'text-muted-foreground',
    primary: 'text-primary',
    warning: 'text-warning',
    success: 'text-success',
  };

  const bgStyles = {
    default: 'bg-muted/40 border-border/60',
    primary: 'bg-primary/10 border-primary/20',
    warning: 'bg-warning/10 border-warning/20',
    success: 'bg-success/10 border-success/20',
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        'group border-border/70 bg-card/70 backdrop-blur-md transition-all duration-200',
        onClick && 'cursor-pointer hover:border-primary/40 hover:bg-card/90 hover:shadow-md hover:-translate-y-0.5'
      )}
    >
      <CardContent className="p-5 flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            {onClick && (
              <ArrowUpRight className="h-3 w-3 text-muted-foreground/60 opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-primary" />
            )}
          </div>
          <div className="text-3xl font-heading font-bold tracking-tight text-foreground">
            {value}
          </div>
          <p className="text-xs text-muted-foreground/80">{subtitle}</p>
        </div>
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl border shadow-inner transition-transform group-hover:scale-105', bgStyles[variant])}>
          <Icon className={cn('h-5 w-5', variantStyles[variant])} />
        </div>
      </CardContent>
    </Card>
  );
};
