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
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning',
    success: 'bg-success/10 text-success',
  };

  return (
    <Card
      onClick={onClick}
      variant="ghost"
      className={cn(
        'group relative overflow-hidden bg-card/40 transition-all duration-200 hover:bg-card/80',
        onClick && 'cursor-pointer'
      )}
    >
      <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
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
          <p className="text-xs text-muted-foreground/70 mt-1">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
};
