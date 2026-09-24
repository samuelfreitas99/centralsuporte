import React, { useState } from 'react';
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

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header onToggleSidebar={() => setSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={onSelectTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 overflow-y-auto py-6">
          <Container>{children}</Container>
        </main>
      </div>
    </div>
  );
};
