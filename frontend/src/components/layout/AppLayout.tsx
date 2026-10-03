import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Container } from './Container';
import { CommandPalette } from './CommandPalette';

interface AppLayoutProps {
  children?: React.ReactNode;
  currentTab?: string;
  onSelectTab?: (tabId: string) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  currentTab = 'dashboard',
  onSelectTab = () => {},
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Atalho global: Ctrl+K / Cmd+K abre a busca sobre a tela atual; Escape fecha o menu mobile
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Link de Acessibilidade (WCAG 2.1 / Skip to Content) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-3.5 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:shadow-md focus:font-medium focus:text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        Pular para o conteúdo principal
      </a>

      <Header
        onToggleSidebar={() => setSidebarOpen(true)}
        onSelectTab={onSelectTab}
        onOpenSearch={() => setSearchOpen(true)}
      />

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} onNavigate={onSelectTab} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={onSelectTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto py-5 focus:outline-none"
          role="main"
          aria-label="Conteúdo Principal"
        >
          <Container>{children}</Container>
        </main>
      </div>
    </div>
  );
};
