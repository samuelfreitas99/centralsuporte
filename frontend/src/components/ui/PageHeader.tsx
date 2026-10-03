import React from 'react';

interface PageHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  /** Uma frase curta dizendo para que serve a tela. */
  description?: string;
  /** Ações principais da tela (ex.: botão "Novo ..."), alinhadas à direita. */
  children?: React.ReactNode;
}

/** Cabeçalho padrão de todas as telas: mesmo tamanho, ícone e posição das ações. */
export const PageHeader: React.FC<PageHeaderProps> = ({ icon: Icon, title, description, children }) => (
  <header className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <h1 className="flex items-center gap-2 font-heading text-2xl font-bold tracking-tight text-foreground">
        <Icon className="h-6 w-6 shrink-0 text-primary" />
        <span className="truncate">{title}</span>
      </h1>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
    {children && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{children}</div>}
  </header>
);
