import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, Briefcase, Calendar, Building2, CheckSquare, Wrench, Headset, Settings, Server, Package, Plus, History, PlayCircle, Activity } from 'lucide-react';
import { projectService } from '@/services/projectService';
import { organizationService } from '@/services/organizationService';
import { maintenanceService } from '@/services/maintenanceService';
import { attendanceService } from '@/services/attendanceService';
import { infrastructureService } from '@/services/infrastructureService';
import type { Project, ProjectSummary, ProjectTimelineEvent } from '@/types/projects';
import type { Task } from '@/types/tasks';
import type { MaintenanceRecord } from '@/types/maintenance';
import type { AttendanceItem } from '@/types/attendance';
import type { EquipmentItem } from '@/types/infrastructure';
import { ProjectFormDrawer } from './ProjectFormDrawer';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import { MaintenanceDrawer } from '@/components/maintenance/MaintenanceDrawer';
import { MaintenanceCreateDrawer } from '@/components/maintenance/MaintenanceCreateDrawer';

interface ProjectWorkspaceProps {
  projectId: number;
  onBack: () => void;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({ projectId, onBack }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [timeline, setTimeline] = useState<ProjectTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data for tabs and overview
  const [tasks, setTasks] = useState<Task[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>([]);
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [loadingAttendances, setLoadingAttendances] = useState(false);
  const [equipments, setEquipments] = useState<EquipmentItem[]>([]);
  const [loadingEquipments, setLoadingEquipments] = useState(false);

  // Modal States
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [maintenanceCreateOpen, setMaintenanceCreateOpen] = useState(false);
  const [maintenanceDetailsOpen, setMaintenanceDetailsOpen] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceRecord | null>(null);
  const [allEquipments, setAllEquipments] = useState<EquipmentItem[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [projData, sumData, eqData, timeData, tasksData, maintData] = await Promise.all([
        projectService.getProject(projectId),
        projectService.getProjectSummary(projectId),
        infrastructureService.getEquipment(),
        projectService.getProjectTimeline(projectId).catch(() => []),
        organizationService.getTasks({ project_id: projectId }),
        maintenanceService.getMaintenances({ project_id: projectId }),
      ]);
      setProject(projData);
      setSummary(sumData);
      setAllEquipments(eqData);
      setTimeline(timeData);
      setTasks(tasksData);
      setMaintenances(maintData);
    } catch (err) {
      console.error('Failed to load project workspace', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Tab data fetching (if necessary, though we preload tasks and maint for overview now)
  useEffect(() => {
    if (activeTab === 'attendance' && attendances.length === 0) {
      setLoadingAttendances(true);
      attendanceService.getAttendances({ project_id: projectId })
        .then(data => setAttendances(data))
        .catch(err => console.error('Error fetching attendances', err))
        .finally(() => setLoadingAttendances(false));
    } else if (activeTab === 'equipment' && equipments.length === 0) {
      setLoadingEquipments(true);
      infrastructureService.getEquipment({ project_id: projectId })
        .then(data => setEquipments(data))
        .catch(err => console.error('Error fetching equipments', err))
        .finally(() => setLoadingEquipments(false));
    }
  }, [activeTab, projectId, attendances.length, equipments.length]);

  const handleSaveTask = async () => {
    const data = await organizationService.getTasks({ project_id: projectId });
    setTasks(data);
    const sum = await projectService.getProjectSummary(projectId);
    setSummary(sum);
  };

  const handleMaintenanceCreated = async () => {
    const data = await maintenanceService.getMaintenances({ project_id: projectId });
    setMaintenances(data);
    const sum = await projectService.getProjectSummary(projectId);
    setSummary(sum);
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando Centro Operacional...</div>;
  }

  if (!project) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        Projeto não encontrado ou você não tem acesso.
        <br />
        <Button onClick={onBack} variant="outline" className="mt-4">Voltar</Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planejado': return <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/50">Planejado</Badge>;
      case 'em_andamento': return <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/50">Em Andamento</Badge>;
      case 'pausado': return <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/50">Pausado</Badge>;
      case 'concluido': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/50">Concluído</Badge>;
      case 'cancelado': return <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/50">Cancelado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingTasks = tasks.filter(t => t.status !== 'concluida' && t.status !== 'cancelada').slice(0, 3);
  const scheduledMaintenances = maintenances.filter(m => m.status === 'agendada' || m.status === 'em_andamento').slice(0, 3);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* HEADER */}
      <div className="bg-card/30 border-b border-border/40 pb-6 mb-6">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 mt-1 hover:bg-slate-800/50">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-heading font-bold text-foreground leading-tight tracking-tight">{project.title}</h1>
                {getStatusBadge(project.status)}
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4 opacity-70" /> {project.owner?.username || 'Sem responsável'}</span>
                {project.store && (
                  <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4 opacity-70" /> {project.store.name}</span>
                )}
                {(project.target_date || project.completion_date) && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 opacity-70" /> 
                    {project.completion_date ? `Concluído em: ${new Date(project.completion_date).toLocaleDateString()}` : `Prazo: ${new Date(project.target_date!).toLocaleDateString()}`}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <History className="h-4 w-4 opacity-70" /> Atualizado: {new Date(project.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full xl:w-auto mt-2 xl:mt-0">
             <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="flex items-center gap-2">
               <Settings className="h-4 w-4" /> <span className="hidden sm:inline">Configurar</span>
             </Button>
             <Button size="sm" onClick={() => { setTaskToEdit(null); setTaskFormOpen(true); }} className="flex items-center gap-2">
               <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Tarefa</span>
             </Button>
             <Button size="sm" onClick={() => setMaintenanceCreateOpen(true)} className="flex items-center gap-2">
               <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Manutenção</span>
             </Button>
             <Button size="sm" onClick={() => {
               window.history.pushState(null, '', `#attendance?new=true&project_id=${projectId}&project_name=${encodeURIComponent(project?.title || '')}`);
               window.dispatchEvent(new Event('popstate'));
             }} className="flex items-center gap-2">
               <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Atendimento</span>
             </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-card/30 border border-border/40 p-1 flex overflow-x-auto w-full justify-start h-auto rounded-lg mb-6">
          <TabsTrigger value="overview" className="flex items-center gap-2 py-2 px-4 rounded-md data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-400">
            <Briefcase className="h-4 w-4" /> Visão Operacional
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2 py-2 px-4 rounded-md data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-400">
            <CheckSquare className="h-4 w-4" /> Tarefas
            {summary && summary.total_tasks > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-slate-800/80">{summary.pending_tasks}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2 py-2 px-4 rounded-md data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-400">
            <Wrench className="h-4 w-4" /> Manutenções
            {summary && summary.total_maintenances > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-slate-800/80">{summary.total_maintenances}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2 py-2 px-4 rounded-md data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-400">
            <Headset className="h-4 w-4" /> Atendimentos
            {summary && summary.total_attendances > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-slate-800/80">{summary.total_attendances}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="equipment" className="flex items-center gap-2 py-2 px-4 rounded-md data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-400">
            <Server className="h-4 w-4" /> Equipamentos
            {summary && summary.total_equipment > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-slate-800/80">{summary.total_equipment}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="stock" className="flex items-center gap-2 py-2 px-4 rounded-md data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-400">
            <Package className="h-4 w-4" /> Estoque
            {summary && summary.total_stock_movements > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-slate-800/80">{summary.total_stock_movements}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 py-2 px-4 rounded-md data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-400">
            <History className="h-4 w-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        <div className="mt-2">
          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="m-0 focus:outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 space-y-6">
                
                {/* METRICS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Card className="bg-card/40 border-border/40 hover:bg-card/60 transition-colors cursor-pointer" onClick={() => setActiveTab('tasks')}>
                    <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                       <CheckSquare className="h-5 w-5 mb-2 text-blue-400/80" />
                       <span className="text-2xl font-bold font-heading">{summary?.total_tasks || 0}</span>
                       <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1">Tarefas</span>
                    </CardContent>
                  </Card>
                  <Card className="bg-card/40 border-border/40 hover:bg-card/60 transition-colors cursor-pointer" onClick={() => setActiveTab('maintenance')}>
                    <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                       <Wrench className="h-5 w-5 mb-2 text-amber-500/80" />
                       <span className="text-2xl font-bold font-heading">{summary?.total_maintenances || 0}</span>
                       <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1">Manutenções</span>
                    </CardContent>
                  </Card>
                  <Card className="bg-card/40 border-border/40 hover:bg-card/60 transition-colors cursor-pointer" onClick={() => setActiveTab('attendance')}>
                    <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                       <Headset className="h-5 w-5 mb-2 text-emerald-500/80" />
                       <span className="text-2xl font-bold font-heading">{summary?.total_attendances || 0}</span>
                       <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1">Atendimentos</span>
                    </CardContent>
                  </Card>
                  <Card className="bg-card/40 border-border/40 hover:bg-card/60 transition-colors cursor-pointer" onClick={() => setActiveTab('equipment')}>
                    <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                       <Server className="h-5 w-5 mb-2 text-indigo-400/80" />
                       <span className="text-2xl font-bold font-heading">{summary?.total_equipment || 0}</span>
                       <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1">Equipamentos</span>
                    </CardContent>
                  </Card>
                </div>

                {/* PROGRESS & DESCRIPTION */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-border/40 bg-card/20 shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-medium text-foreground text-sm tracking-wide uppercase">Progresso Geral</h3>
                        <span className="text-2xl font-bold text-blue-400">{summary?.progress_percentage.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-800/80 rounded-full h-2.5 mb-4 overflow-hidden shadow-inner">
                        <div 
                          className="bg-blue-500 h-2.5 rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${summary?.progress_percentage || 0}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground font-medium">
                        <span>{summary?.completed_tasks} concluidas</span>
                        <span>{summary?.pending_tasks} pendentes</span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-border/40 bg-card/20 shadow-sm">
                    <CardHeader className="pb-2 pt-5 px-6">
                      <CardTitle className="text-sm font-medium tracking-wide uppercase text-foreground">Escopo / Descrição</CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-0 text-sm text-muted-foreground/90 whitespace-pre-wrap">
                      {project.description || 'Nenhuma descrição detalhada informada.'}
                    </CardContent>
                  </Card>
                </div>

                {/* NEXT ACTIONS */}
                <Card className="border-border/40 bg-card/20 shadow-sm">
                  <CardHeader className="pb-3 border-b border-border/40">
                    <CardTitle className="text-base flex items-center gap-2">
                       <PlayCircle className="h-4 w-4 text-amber-500" /> Próximas Ações
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/40">
                      {pendingTasks.length > 0 ? pendingTasks.map(task => (
                        <div key={`task-${task.id}`} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors group cursor-pointer" onClick={() => { setTaskToEdit(task); setTaskFormOpen(true); }}>
                          <div className="flex items-start gap-3">
                            <CheckSquare className="h-4 w-4 text-blue-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium group-hover:text-blue-400 transition-colors">{task.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Tarefa • {task.priority}</p>
                            </div>
                          </div>
                        </div>
                      )) : null}
                      
                      {scheduledMaintenances.length > 0 ? scheduledMaintenances.map(maint => (
                        <div key={`maint-${maint.id}`} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors group cursor-pointer" onClick={() => { setSelectedMaintenance(maint); setMaintenanceDetailsOpen(true); }}>
                          <div className="flex items-start gap-3">
                            <Wrench className="h-4 w-4 text-amber-500 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium group-hover:text-amber-500 transition-colors">{maint.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Manutenção • {maint.scheduled_date ? new Date(maint.scheduled_date).toLocaleDateString() : 'Sem data'}</p>
                            </div>
                          </div>
                        </div>
                      )) : null}

                      {pendingTasks.length === 0 && scheduledMaintenances.length === 0 && (
                        <div className="p-8 text-center">
                          <p className="text-sm text-muted-foreground">Tudo em dia. Nenhuma ação iminente.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* TIMELINE */}
              <div className="space-y-6">
                <Card className="border-border/40 bg-card/20 shadow-sm h-full min-h-[400px] flex flex-col">
                  <CardHeader className="pb-3 border-b border-border/40">
                    <CardTitle className="text-base flex items-center gap-2">
                       <History className="h-4 w-4 text-indigo-400" /> Atividade Recente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 flex-grow">
                    <div className="space-y-5">
                      {timeline.slice(0, 6).map((event, idx) => (
                        <div key={`tl-${idx}`} className="flex gap-3 relative">
                          {idx !== timeline.slice(0, 6).length - 1 && (
                            <div className="absolute left-[9px] top-5 bottom-[-15px] w-px bg-border/50"></div>
                          )}
                          <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5 z-10">
                            {event.type === 'note' ? <History className="h-2.5 w-2.5 text-blue-400" /> : <Activity className="h-2.5 w-2.5 text-slate-400" />}
                          </div>
                          <div>
                            <p className="text-sm text-foreground/90 leading-tight">{event.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(event.created_at).toLocaleString()} • {event.author?.username || 'Sistema'}
                            </p>
                          </div>
                        </div>
                      ))}
                      {timeline.length === 0 && (
                         <div className="text-center text-sm text-muted-foreground py-12">Nenhuma atividade registrada.</div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 pb-4 px-4 border-t border-border/40 mt-auto">
                    <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground" onClick={() => setActiveTab('history')}>Ver histórico completo</Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TASKS TAB */}
          <TabsContent value="tasks" className="m-0 focus:outline-none">
            <Card className="border-border/40 bg-card/20 shadow-sm">
              <div className="p-4 border-b border-border/40 flex justify-between items-center bg-card/30">
                <h3 className="font-medium">Tarefas</h3>
                <Button size="sm" onClick={() => { setTaskToEdit(null); setTaskFormOpen(true); }} className="h-8">
                  <Plus className="h-3.5 w-3.5 mr-2" /> Nova Tarefa
                </Button>
              </div>
              <CardContent className="p-0">
                {tasks.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                    <div className="h-12 w-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                       <CheckSquare className="h-6 w-6 text-slate-500" />
                    </div>
                    <p className="font-medium text-foreground mb-1">Este projeto ainda não possui tarefas</p>
                    <p className="text-sm mb-6 max-w-sm">Crie a primeira tarefa para começar a acompanhar o progresso operacional do projeto.</p>
                    <Button onClick={() => { setTaskToEdit(null); setTaskFormOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" /> Nova Tarefa
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {tasks.map(task => (
                      <div key={task.id} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                        <div>
                          <h4 className="font-medium text-sm text-foreground/90">{task.title}</h4>
                          <div className="flex gap-2 mt-1.5">
                            <span className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground bg-slate-800/60 px-2 py-0.5 rounded border border-border/40">{task.status.replace('_', ' ')}</span>
                            <span className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground bg-slate-800/60 px-2 py-0.5 rounded border border-border/40">{task.priority}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => { setTaskToEdit(task); setTaskFormOpen(true); }}>Abrir</Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* MAINTENANCE TAB */}
          <TabsContent value="maintenance" className="m-0 focus:outline-none">
            <Card className="border-border/40 bg-card/20 shadow-sm">
              <div className="p-4 border-b border-border/40 flex justify-between items-center bg-card/30">
                <h3 className="font-medium">Manutenções</h3>
                <Button size="sm" onClick={() => setMaintenanceCreateOpen(true)} className="h-8">
                  <Plus className="h-3.5 w-3.5 mr-2" /> Nova Manutenção
                </Button>
              </div>
              <CardContent className="p-0">
                {maintenances.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                    <div className="h-12 w-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                       <Wrench className="h-6 w-6 text-slate-500" />
                    </div>
                    <p className="font-medium text-foreground mb-1">Nenhuma manutenção vinculada</p>
                    <p className="text-sm mb-6 max-w-sm">Agende manutenções preventivas ou corretivas atreladas a este projeto.</p>
                    <Button onClick={() => setMaintenanceCreateOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Nova Manutenção
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {maintenances.map(maint => (
                      <div key={maint.id} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                        <div>
                          <h4 className="font-medium text-sm text-foreground/90">{maint.title}</h4>
                          <div className="flex gap-2 mt-1.5">
                            <span className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground bg-slate-800/60 px-2 py-0.5 rounded border border-border/40">{maint.status.replace('_', ' ')}</span>
                            <span className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground bg-slate-800/60 px-2 py-0.5 rounded border border-border/40">{maint.maintenance_type}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedMaintenance(maint); setMaintenanceDetailsOpen(true); }}>Detalhes</Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ATTENDANCE TAB */}
          <TabsContent value="attendance" className="m-0 focus:outline-none">
            <Card className="border-border/40 bg-card/20 shadow-sm">
              <div className="p-4 border-b border-border/40 flex justify-between items-center bg-card/30">
                <h3 className="font-medium">Atendimentos</h3>
                <Button size="sm" onClick={() => {
                  window.history.pushState(null, '', `#attendance?new=true&project_id=${projectId}&project_name=${encodeURIComponent(project?.title || '')}`);
                  window.dispatchEvent(new Event('popstate'));
                }} className="h-8">
                  <Plus className="h-3.5 w-3.5 mr-2" /> Novo Atendimento
                </Button>
              </div>
              <CardContent className="p-0">
                {loadingAttendances ? (
                  <div className="p-8 text-center text-muted-foreground">Carregando atendimentos...</div>
                ) : attendances.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                    <div className="h-12 w-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                       <Headset className="h-6 w-6 text-slate-500" />
                    </div>
                    <p className="font-medium text-foreground mb-1">Nenhum atendimento vinculado</p>
                    <p className="text-sm mb-6 max-w-sm">Abra chamados para resolução de problemas ocorrendo durante a execução do projeto.</p>
                    <Button onClick={() => {
                      window.history.pushState(null, '', `#attendance?new=true&project_id=${projectId}&project_name=${encodeURIComponent(project?.title || '')}`);
                      window.dispatchEvent(new Event('popstate'));
                    }}>
                      <Plus className="h-4 w-4 mr-2" /> Novo Atendimento
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {attendances.map(a => (
                      <div key={a.id} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                        <div>
                          <h4 className="font-medium text-sm text-foreground/90">{a.title}</h4>
                          <div className="flex gap-2 mt-1.5">
                            <span className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground bg-slate-800/60 px-2 py-0.5 rounded border border-border/40">{a.status.replace('_', ' ')}</span>
                            {a.requester_name && <span className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground bg-slate-800/60 px-2 py-0.5 rounded border border-border/40">{a.requester_name}</span>}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => {
                          window.history.pushState(null, '', `#attendance?id=${a.id}&project_id=${projectId}`);
                          window.dispatchEvent(new Event('popstate'));
                        }}>Visualizar</Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* EQUIPMENT TAB */}
          <TabsContent value="equipment" className="m-0 focus:outline-none">
            <Card className="border-border/40 bg-card/20 shadow-sm">
              <div className="p-4 border-b border-border/40 flex justify-between items-center bg-card/30">
                <h3 className="font-medium">Equipamentos em Instalação / Uso</h3>
              </div>
              <CardContent className="p-0">
                {loadingEquipments ? (
                  <div className="p-8 text-center text-muted-foreground">Carregando equipamentos...</div>
                ) : equipments.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                    <div className="h-12 w-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                       <Server className="h-6 w-6 text-slate-500" />
                    </div>
                    <p className="font-medium text-foreground mb-1">Nenhum equipamento associado</p>
                    <p className="text-sm max-w-sm mb-6">Associe equipamentos que estão sendo instalados, trocados ou monitorados neste projeto.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {equipments.map(eq => (
                      <div key={eq.id} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                        <div>
                          <h4 className="font-medium text-sm text-foreground/90">{eq.patrimony} - {eq.hostname}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">{eq.brand} {eq.model}</p>
                        </div>
                        <Badge variant="outline" className="bg-slate-800/60 border-border/40">{eq.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* STOCK TAB */}
          <TabsContent value="stock" className="m-0 focus:outline-none">
             <Card className="border-border/40 bg-card/20 shadow-sm">
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                   <div className="h-12 w-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                       <Package className="h-6 w-6 text-slate-500" />
                   </div>
                   <p className="font-medium text-foreground mb-1">Módulo de Estoque (Em Breve)</p>
                   <p className="text-sm max-w-sm">Movimentações atreladas ao projeto aparecerão aqui.</p>
                </div>
             </Card>
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="m-0 focus:outline-none">
             <Card className="border-border/40 bg-card/20 shadow-sm">
               <div className="p-4 border-b border-border/40 bg-card/30">
                 <h3 className="font-medium">Histórico Completo do Projeto</h3>
               </div>
               <CardContent className="p-0">
                  {timeline.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">Nenhum evento registrado no histórico.</div>
                  ) : (
                    <div className="divide-y divide-border/40">
                       {timeline.map((event, idx) => (
                         <div key={`fulltl-${idx}`} className="p-4 hover:bg-slate-800/30 transition-colors">
                            <div className="flex gap-4">
                               <div className="mt-1">
                                  {event.type === 'note' ? <History className="h-4 w-4 text-blue-400" /> : <Activity className="h-4 w-4 text-slate-400" />}
                               </div>
                               <div>
                                  <p className="text-sm text-foreground/90 font-medium">{event.title}</p>
                                  {event.description && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{event.description}</p>}
                                  <p className="text-xs text-muted-foreground/70 mt-2">
                                     {new Date(event.created_at).toLocaleString()} • Por: {event.author?.username || 'Sistema'}
                                  </p>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                  )}
               </CardContent>
             </Card>
          </TabsContent>

        </div>
      </Tabs>

      <ProjectFormDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
        onSaved={loadData}
      />

      <TaskFormDialog
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        taskToEdit={taskToEdit}
        initialProjectId={projectId}
        initialProjectName={project?.title}
        onSave={async (payload) => {
          if (taskToEdit) {
            await organizationService.updateTask(taskToEdit.id, payload as any);
          } else {
            await organizationService.createTask(payload as any);
          }
          await handleSaveTask();
        }}
      />

      <MaintenanceCreateDrawer
        isOpen={maintenanceCreateOpen}
        onClose={() => setMaintenanceCreateOpen(false)}
        equipmentList={allEquipments}
        checklistTemplates={[]}
        initialProjectId={projectId}
        initialProjectName={project?.title}
        onSuccess={async () => {
          await handleMaintenanceCreated();
        }}
      />

      {selectedMaintenance && (
        <MaintenanceDrawer
          isOpen={maintenanceDetailsOpen}
          onClose={() => setMaintenanceDetailsOpen(false)}
          maintenance={selectedMaintenance}
          equipmentList={allEquipments}
          onSuccess={async () => {
            await handleMaintenanceCreated();
          }}
          onChecklistItemToggle={async (checklistId, itemId, val) => {
             await maintenanceService.toggleChecklistItem(checklistId, itemId, val);
             await handleMaintenanceCreated();
          }}
        />
      )}
    </div>
  );
};
