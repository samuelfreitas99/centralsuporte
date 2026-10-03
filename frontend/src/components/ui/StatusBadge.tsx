import React from 'react';
import { Badge } from './badge';
import { priorityMeta, statusMeta, type StatusDomain } from '@/lib/status';

interface StatusBadgeProps {
  domain: StatusDomain;
  status: string;
  className?: string;
}

/** Badge de status padronizado (rótulos e cores em `lib/status.ts`). */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ domain, status, className }) => {
  const meta = statusMeta(domain, status);
  return (
    <Badge variant={meta.variant} className={className}>
      {meta.label}
    </Badge>
  );
};

/** Badge de prioridade padronizado (baixa, média, alta, urgente). */
export const PriorityBadge: React.FC<{ priority: string; className?: string }> = ({ priority, className }) => {
  const meta = priorityMeta(priority);
  return (
    <Badge variant={meta.variant} className={className}>
      {meta.label}
    </Badge>
  );
};
