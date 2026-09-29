import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  Terminal,
  Headset,
  Wrench,
  Server,
  FolderArchive,
  Users,
  Search,
  ShieldAlert,
  Briefcase,
  Shield,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  section?: 'operacional' | 'sistema';
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'operacional' },
  { id: 'search-reports', label: 'Pesquisa & Relatórios', icon: Search, section: 'operacional' },
  { id: 'projects', label: 'Projetos', icon: Briefcase, section: 'operacional' },
  { id: 'tasks', label: 'Tarefas e Checklists', icon: CheckSquare, section: 'operacional' },
  { id: 'maintenances', label: 'Manutenções', icon: Wrench, section: 'operacional' },
  { id: 'knowledge', label: 'Base de Conhecimento', icon: BookOpen, section: 'operacional' },
  { id: 'commands', label: 'Comandos e Respostas', icon: Terminal, section: 'operacional' },
  { id: 'attendance', label: 'Atendimentos Internos', icon: Headset, section: 'operacional' },
  { id: 'equipment', label: 'Infraestrutura & Parque', icon: Server, section: 'sistema' },
  { id: 'files', label: 'Arquivos e Docs', icon: FolderArchive, section: 'sistema' },
  { id: 'users', label: 'Usuários', icon: Users, permission: 'users:read', section: 'sistema' },
  { id: 'roles', label: 'Perfis e Permissões', icon: Shield, permission: 'roles:read', section: 'sistema' },
  { id: 'audit', label: 'Auditoria & Logs', icon: ShieldAlert, permission: 'audit:read', section: 'sistema' },
];
