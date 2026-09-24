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
    default: 'text-slate-300',
    primary: 'text-blue-400',
    warning: 'text-amber-400',
    success: 'text-emerald-400',
  };

  const bgStyles = {
    default: 'bg-slate-800/60 border-slate-700/50 shadow-slate-900/40',
    primary: 'bg-blue-600/15 border-blue-500/30 shadow-blue-900/30',
    warning: 'bg-amber-500/15 border-amber-500/30 shadow-amber-900/30',
    success: 'bg-emerald-500/15 border-emerald-500/30 shadow-emerald-900/30',
  };

  return (
    <Card className="border-border/80 bg-card/75 backdrop-blur-md transition-all duration-200 hover:border-blue-500/30 hover:shadow-lg hover:-translate-y-0.5">
      <CardContent className="p-5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <div className="text-3xl font-heading font-bold tracking-tight text-foreground">
            {value}
          </div>
          <p className="text-xs text-muted-foreground/80">{subtitle}</p>
        </div>
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl border shadow-inner', bgStyles[variant])}>
          <Icon className={cn('h-6 w-6', variantStyles[variant])} />
        </div>
      </CardContent>
    </Card>
  );
};
