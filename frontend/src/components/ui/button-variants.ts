import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-xs sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90',
        outline:
          'border border-border/70 bg-card/60 shadow-xs hover:bg-muted/60 hover:text-foreground hover:border-border text-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost:
          'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
        link:
          'text-primary underline-offset-4 hover:underline p-0 h-auto font-normal',
      },
      size: {
        default: 'h-8.5 px-3.5 py-1.5',
        sm: 'h-7.5 px-2.5 text-xs rounded-md',
        lg: 'h-10 px-6 text-sm rounded-lg',
        icon: 'h-8.5 w-8.5 p-0',
        'icon-sm': 'h-7.5 w-7.5 p-0 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
