import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:from-blue-500 hover:to-indigo-500 hover:shadow-md hover:shadow-blue-500/20 hover:-translate-y-0.5',
        destructive:
          'bg-destructive text-white shadow-sm hover:bg-destructive/90 hover:shadow-md hover:shadow-destructive/20 hover:-translate-y-0.5',
        outline:
          'border border-border/80 bg-background/50 shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-border',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:brightness-105',
        ghost: 'hover:bg-accent/60 hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-lg px-8 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
