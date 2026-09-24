import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
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
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tarefas e Checklists', icon: CheckSquare },
  { id: 'knowledge', label: 'Base de Conhecimento', icon: BookOpen },
  { id: 'attendance', label: 'Atendimentos Internos', icon: Headset },
  { id: 'equipment', label: 'Equipamentos', icon: Server },
  { id: 'files', label: 'Arquivos e Docs', icon: FolderArchive },
  { id: 'users', label: 'Usuários e Perfis', icon: Users, permission: 'users:read' },
];
