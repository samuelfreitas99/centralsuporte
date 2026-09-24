import { cva } from 'class-variance-authority';

export const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary/15 text-primary border border-primary/25 font-semibold',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive/15 text-destructive border border-destructive/30 font-medium',
        outline: 'border-border/80 text-foreground',
        success:
          'border-transparent bg-success/15 text-success border border-success/30 font-medium',
        warning:
          'border-transparent bg-warning/15 text-warning border border-warning/30 font-medium',
        info:
          'border-transparent bg-info/15 text-info border border-info/30 font-medium',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);
