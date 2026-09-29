import React, { useState, useEffect } from 'react';
import { User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  status?: 'active' | 'inactive';
  alt?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base font-semibold',
  xl: 'h-20 w-20 text-xl font-bold',
  '2xl': 'h-24 w-24 text-2xl font-bold',
};

const statusSizeClasses = {
  xs: 'h-1.5 w-1.5 ring-1',
  sm: 'h-2 w-2 ring-1',
  md: 'h-2.5 w-2.5 ring-2',
  lg: 'h-3.5 w-3.5 ring-2',
  xl: 'h-4 w-4 ring-2',
  '2xl': 'h-4.5 w-4.5 ring-2',
};

// Deterministic color palette for initials based on name hash
const colorSchemes = [
  'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
  'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
];

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColorScheme(name?: string | null): string {
  if (!name) return colorSchemes[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorSchemes.length;
  return colorSchemes[index];
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  status,
  alt,
  className,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const initials = getInitials(name);
  const colorScheme = getColorScheme(name);

  // Reset error when src changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  const showImage = !!src && !hasError;

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center rounded-full border border-border/70 overflow-hidden font-heading',
        sizeClasses[size],
        !showImage && colorScheme,
        className
      )}
      role="img"
      aria-label={alt || name || 'Avatar do usuário'}
      {...props}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          onError={() => setHasError(true)}
          className="h-full w-full object-cover"
        />
      ) : initials ? (
        <span className="font-semibold uppercase tracking-wider">{initials}</span>
      ) : (
        <UserIcon className="h-1/2 w-1/2 text-muted-foreground" aria-hidden="true" />
      )}

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-background',
            statusSizeClasses[size],
            status === 'active' ? 'bg-emerald-500' : 'bg-muted-foreground/60'
          )}
          title={status === 'active' ? 'Usuário ativo' : 'Usuário inativo'}
        />
      )}
    </div>
  );
};
