import React from 'react';
import { cn } from '@/lib/utils';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'default' | 'fluid' | 'narrow';
}

export const Container: React.FC<ContainerProps> = ({
  className,
  size = 'default',
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        size === 'default' && 'max-w-7xl',
        size === 'narrow' && 'max-w-4xl',
        size === 'fluid' && 'max-w-full',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
