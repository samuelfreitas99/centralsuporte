import React, { useState, useEffect } from 'react';
import { projectService } from '@/services/projectService';
import type { Project } from '@/types/projects';
import { Check, ChevronsUpDown, Briefcase, Loader2, X } from 'lucide-react';
// Removed Button
import {} from '@/components/ui/badge';

interface ProjectSelectProps {
  value: number | null | undefined;
  onChange: (projectId: number | null) => void;
  disabled?: boolean;
  lockedContextName?: string;
}

export const ProjectSelect: React.FC<ProjectSelectProps> = ({ value, onChange, disabled, lockedContextName }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (lockedContextName) return;

    const fetchProjects = async () => {
      try {
        setLoading(true);
        // Em um sistema real poderíamos usar paginação/busca
        // Aqui buscaremos os não-cancelados ou o que já está selecionado
        const data = await projectService.getProjects();
        setProjects(data);
      } catch (err) {
        console.error('Failed to fetch projects for select', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const selectedProject = projects.find(p => p.id === value);

  if (lockedContextName) {
    return (
      <div className="flex min-h-10 w-full items-center justify-between rounded-md border border-slate-700/50 bg-slate-900/30 px-3 py-2 text-sm text-slate-400 select-none">
        <div className="flex items-center gap-2 overflow-hidden">
          <Briefcase className="h-4 w-4 shrink-0" />
          <span className="truncate">{lockedContextName}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Vinculado</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div 
        className={`flex min-h-10 w-full items-center justify-between rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-slate-600'}`}
        onClick={() => !disabled && setOpen(!open)}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Briefcase className="h-4 w-4 text-slate-400 shrink-0" />
          {loading ? (
            <span className="flex items-center gap-2 text-slate-400">
              <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
            </span>
          ) : selectedProject ? (
            <span className="truncate">{selectedProject.title}</span>
          ) : (
            <span className="text-slate-400">Vincular a um Projeto...</span>
          )}
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
          {selectedProject && !disabled && (
            <div 
              role="button"
              className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-200" 
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </div>
          )}
          <ChevronsUpDown className="h-4 w-4 text-slate-400" />
        </div>
      </div>

      {open && !disabled && (
        <div className="absolute top-full left-0 mt-1 w-full z-50 rounded-md border border-slate-700 bg-slate-900 shadow-xl max-h-60 overflow-auto">
          {projects.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-400">Nenhum projeto encontrado.</div>
          ) : (
            <ul className="py-1">
              {projects.map(project => (
                <li 
                  key={project.id}
                  className="flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-800 cursor-pointer"
                  onClick={() => {
                    onChange(project.id);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`truncate ${value === project.id ? 'font-medium text-blue-400' : 'text-slate-200'}`}>
                      {project.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] uppercase text-slate-500">{project.status.replace('_', ' ')}</span>
                    {value === project.id && <Check className="h-4 w-4 text-blue-500" />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      
      {/* Click away listener using a transparent overlay */}
      {open && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setOpen(false)} 
        />
      )}
    </div>
  );
};
