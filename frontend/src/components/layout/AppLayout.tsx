import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Container } from './Container';

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

  // Atalho global de teclado: Ctrl+K ou Cmd+K para busca global
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onSelectTab('search-reports');
      }
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectTab, sidebarOpen]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Link de Acessibilidade (WCAG 2.1 / Skip to Content) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-primary focus:text-primary-foreground focus:rounded-xl focus:shadow-xl focus:font-semibold focus:outline-none"
      >
        Pular para o conteúdo principal
      </a>

      <Header
        onToggleSidebar={() => setSidebarOpen(true)}
        onSelectTab={onSelectTab}
      />

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
          className="flex-1 overflow-y-auto py-6 focus:outline-none"
          role="main"
          aria-label="Conteúdo Principal"
        >
          <Container>{children}</Container>
        </main>
      </div>
    </div>
  );
};

