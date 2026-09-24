import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  Terminal,
  Headset,
  Server,
  FolderArchive,
  Users,
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
  { id: 'tasks', label: 'Tarefas e Checklists', icon: CheckSquare, section: 'operacional' },
  { id: 'knowledge', label: 'Base de Conhecimento', icon: BookOpen, section: 'operacional' },
  { id: 'commands', label: 'Comandos e Respostas', icon: Terminal, section: 'operacional' },
  { id: 'attendance', label: 'Atendimentos Internos', icon: Headset, section: 'operacional' },
  { id: 'equipment', label: 'Infraestrutura & Parque', icon: Server, section: 'sistema' },
  { id: 'files', label: 'Arquivos e Docs', icon: FolderArchive, section: 'sistema' },
  { id: 'users', label: 'Usuários e Perfis', icon: Users, permission: 'users:read', section: 'sistema' },
];
