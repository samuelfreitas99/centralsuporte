import { cva } from 'class-variance-authority';

export const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary/20 text-primary border border-primary/30 font-semibold',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive/15 text-red-400 border border-destructive/30 font-medium',
        outline: 'border-border/80 text-foreground',
        success:
          'border-transparent bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium',
        warning:
          'border-transparent bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium',
        info:
          'border-transparent bg-sky-500/15 text-sky-400 border border-sky-500/30 font-medium',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);
