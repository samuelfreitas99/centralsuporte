import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'warning' | 'primary' | 'success';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
}) => {
  const variantStyles = {
    default: 'text-foreground',
    primary: 'text-primary',
    warning: 'text-amber-500',
    success: 'text-emerald-500',
  };

  const bgStyles = {
    default: 'bg-muted/50 border-border',
    primary: 'bg-primary/10 border-primary/20',
    warning: 'bg-amber-500/10 border-amber-500/20',
    success: 'bg-emerald-500/10 border-emerald-500/20',
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardContent className="p-5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <div className="text-3xl font-bold tracking-tight text-foreground">
            {value}
          </div>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl border', bgStyles[variant])}>
          <Icon className={cn('h-6 w-6', variantStyles[variant])} />
        </div>
      </CardContent>
    </Card>
  );
};
