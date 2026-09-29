import React, { useState, useEffect } from 'react';
import { ProjectWorkspace } from './projects/ProjectWorkspace';
import { ProjectList } from './projects/ProjectList';

interface ProjectsPageProps {
  onSelectTab: (tab: string) => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = () => {
  const [projectId, setProjectId] = useState<number | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.split('?')[1] || '');
      const id = params.get('id');
      setProjectId(id ? parseInt(id, 10) : null);
    };

    // Parse initial state
    handleHashChange();

    window.addEventListener('popstate', handleHashChange);
    return () => window.removeEventListener('popstate', handleHashChange);
  }, []);

  if (projectId) {
    return <ProjectWorkspace projectId={projectId} onBack={() => {
      window.history.pushState(null, '', '#projects');
      window.dispatchEvent(new Event('popstate'));
    }} />;
  }

  return <ProjectList />;
};
