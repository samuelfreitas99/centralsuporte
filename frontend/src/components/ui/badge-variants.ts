import { cva } from 'class-variance-authority';

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium tracking-tight transition-colors focus:outline-none focus:ring-1 focus:ring-ring',
  {
    variants: {
      variant: {
        default:
          'bg-primary/10 text-primary border border-primary/20 font-semibold',
        secondary:
          'bg-secondary text-secondary-foreground border border-border/40',
        destructive:
          'bg-destructive/10 text-destructive border border-destructive/20 font-medium',
        outline:
          'border border-border/70 text-muted-foreground bg-transparent',
        success:
          'bg-success/10 text-success border border-success/20 font-medium',
        warning:
          'bg-warning/10 text-warning border border-warning/20 font-medium',
        info:
          'bg-info/10 text-info border border-info/20 font-medium',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);
