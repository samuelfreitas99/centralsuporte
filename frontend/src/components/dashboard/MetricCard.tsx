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
  const bgStyles = {
    default: 'bg-muted/40 text-muted-foreground',
    primary: 'bg-primary/10 text-primary border border-primary/20',
    warning: 'bg-warning/10 text-warning border border-warning/20',
    success: 'bg-success/10 text-success border border-success/20',
  };

  return (
    <Card
      onClick={onClick}
      variant="default"
      className={cn(
        'group relative overflow-hidden bg-card border-border/60 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md',
        onClick && 'cursor-pointer'
      )}
    >
      <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', bgStyles[variant])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-heading font-bold tracking-tight text-foreground">
              {value}
            </span>
            {onClick && (
              <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-primary translate-y-1 group-hover:translate-y-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-medium">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
};
