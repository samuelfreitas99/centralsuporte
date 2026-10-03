import React, { useState, useEffect, useCallback } from 'react';
import { formatDate } from '@/lib/format';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Briefcase, Calendar, User as UserIcon, Building2, Clock } from 'lucide-react';
import { projectService } from '@/services/projectService';
import type { Project, ProjectSummary } from '@/types/projects';
import { ProjectFormDrawer } from './ProjectFormDrawer';

export const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [summaries, setSummaries] = useState<Record<number, ProjectSummary>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [formOpen, setFormOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const data = await projectService.getProjects({
        status: statusFilter || undefined,
      });
      
      const filtered = searchTerm
        ? data.filter((p) => p.title.toLowerCase().includes(searchTerm.toLowerCase()))
        : data;

      const statusWeight: Record<string, number> = {
        'em_andamento': 1,
        'planejado': 2,
        'pausado': 3,
        'concluido': 4,
        'cancelado': 5,
      };

      const sorted = filtered.sort((a, b) => {
        const weightA = statusWeight[a.status] || 99;
        const weightB = statusWeight[b.status] || 99;
        if (weightA !== weightB) return weightA - weightB;
        return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
      });
      
      setProjects(sorted);

      // Lazily load summaries for progress tracking
      sorted.forEach((p) => {
        projectService.getProjectSummary(p.id).then((summary) => {
           setSummaries((prev) => ({ ...prev, [p.id]: summary }));
        }).catch(() => {});
      });

    } catch (err) {
      console.error('Falha ao buscar projetos', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleOpenProject = (id: number) => {
    window.history.pushState(null, '', `#projects?id=${id}`);
    window.dispatchEvent(new Event('popstate'));
  };

  const getStatusBadge = (status: string) => <StatusBadge domain="project" status={status} />;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader icon={Briefcase} title="Projetos" description="Implantações, reformas e aberturas de loja que agrupam várias atividades.">
        <Button onClick={() => { setProjectToEdit(null); setFormOpen(true); }} className="w-full sm:w-auto flex items-center gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Novo Projeto
        </Button>
      </PageHeader>

      <div className="bg-card/40 border border-border/40 p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar projetos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background/50 border-border/50 focus:border-blue-500/50 h-10"
          />
        </div>
        <div className="w-full sm:w-auto flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-48 h-10 rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-foreground"
          >
            <option value="">Todos os status</option>
            <option value="planejado">Planejado</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="pausado">Pausado</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground animate-pulse">Carregando projetos...</div>
      ) : projects.length === 0 ? (
        <Card className="border-border/40 bg-card/20 shadow-sm">
          <CardContent className="p-16 text-center text-muted-foreground max-w-md mx-auto flex flex-col items-center">
            <div className="h-16 w-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-6">
              <Briefcase className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-xl font-heading font-semibold text-foreground mb-3 tracking-tight">Nenhum projeto encontrado</h3>
            <p className="text-sm mb-8 leading-relaxed">
              Crie um projeto para organizar tarefas, equipamentos, manutenções e atendimentos atrelados a um mesmo objetivo operacional.
            </p>
            <Button onClick={() => { setProjectToEdit(null); setFormOpen(true); }} className="w-full sm:w-auto flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeiro Projeto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map((project) => {
             const summary = summaries[project.id];
             return (
               <Card
                 key={project.id} 
                 className="group relative flex flex-col overflow-hidden border-border/40 bg-card/30 hover:bg-card/60 hover:border-blue-500/40 transition-all cursor-pointer shadow-sm hover:shadow-md h-full"
                 onClick={() => handleOpenProject(project.id)}
               >
                 <CardContent className="p-5 flex flex-col h-full">
                   <div className="flex justify-between items-start mb-4 gap-3">
                     <h3 className="font-heading font-bold text-foreground/90 text-lg leading-tight line-clamp-2 group-hover:text-blue-400 transition-colors">{project.title}</h3>
                     <div className="shrink-0 mt-0.5">{getStatusBadge(project.status)}</div>
                   </div>
                   
                   <p className="text-sm text-muted-foreground line-clamp-2 mb-6 flex-grow leading-relaxed">
                     {project.description || 'Nenhuma descrição fornecida.'}
                   </p>
                   
                   <div className="space-y-4 mt-auto">
                      {/* PROGRESS BAR */}
                      <div>
                         <div className="flex justify-between text-xs mb-1.5 font-medium">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="text-foreground/80">{summary ? `${summary.progress_percentage.toFixed(0)}%` : '...'}</span>
                         </div>
                         <div className="w-full bg-slate-800/60 rounded-full h-1.5 overflow-hidden">
                            <div 
                               className="bg-blue-500 h-1.5 rounded-full transition-all duration-700 ease-out" 
                               style={{ width: summary ? `${summary.progress_percentage}%` : '0%' }}
                            />
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 text-xs text-muted-foreground pt-2 border-t border-border/30">
                        {project.store && (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            <span className="truncate">{project.store.name}</span>
                          </div>
                        )}
                        {project.owner && (
                          <div className="flex items-center gap-1.5">
                            <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                            <span className="truncate">{project.owner.username}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate">
                            {project.end_date 
                              ? `Fim: ${formatDate(project.end_date)}` 
                              : project.expected_end_date 
                                ? `Prazo: ${formatDate(project.expected_end_date)}` 
                                : 'Sem prazo'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate">Atualizado: {formatDate(project.updated_at || project.created_at)}</span>
                        </div>
                      </div>
                   </div>
                 </CardContent>
               </Card>
             );
          })}
        </div>
      )}

      <ProjectFormDrawer
        open={formOpen}
        onOpenChange={setFormOpen}
        project={projectToEdit}
        onSaved={loadProjects}
      />
    </div>
  );
};
