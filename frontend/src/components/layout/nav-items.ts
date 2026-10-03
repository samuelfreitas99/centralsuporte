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
  BarChart3,
  ShieldAlert,
  Briefcase,
} from 'lucide-react';

export type NavSection = 'inicio' | 'dia-a-dia' | 'conhecimento' | 'inventario' | 'gestao';

export interface NavItem {
  /** Identificador usado no hash da URL (`#id`). Não renomeie: quebra links salvos. */
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  section: NavSection;
  /** Outros ids de hash que também marcam este item como ativo (sub-telas). */
  activeFor?: string[];
}

/** Grupos do menu, na ordem em que aparecem. `title` vazio = sem cabeçalho. */
export const NAV_SECTIONS: { id: NavSection; title: string }[] = [
  { id: 'inicio', title: '' },
  { id: 'dia-a-dia', title: 'Dia a dia' },
  { id: 'conhecimento', title: 'Conhecimento' },
  { id: 'inventario', title: 'Inventário' },
  { id: 'gestao', title: 'Gestão' },
];

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Início', icon: LayoutDashboard, section: 'inicio' },

  { id: 'attendance', label: 'Atendimentos', icon: Headset, permission: 'attendance:read', section: 'dia-a-dia' },
  { id: 'tasks', label: 'Tarefas e Agenda', icon: CheckSquare, permission: 'tasks:read', section: 'dia-a-dia' },
  { id: 'maintenances', label: 'Manutenções', icon: Wrench, permission: 'maintenance:read', section: 'dia-a-dia' },
  { id: 'projects', label: 'Projetos', icon: Briefcase, permission: 'project:read', section: 'dia-a-dia' },

  { id: 'knowledge', label: 'Base de Conhecimento', icon: BookOpen, permission: 'knowledge:read', section: 'conhecimento' },
  { id: 'commands', label: 'Comandos e Respostas', icon: Terminal, permission: 'knowledge:read', section: 'conhecimento' },
  { id: 'files', label: 'Arquivos', icon: FolderArchive, permission: 'attachment:read', section: 'conhecimento' },

  { id: 'equipment', label: 'Equipamentos e Lojas', icon: Server, permission: 'equipment:read', section: 'inventario' },

  { id: 'reports', label: 'Relatórios', icon: BarChart3, section: 'gestao' },
  { id: 'users', label: 'Usuários e Permissões', icon: Users, permission: 'users:read', section: 'gestao', activeFor: ['roles'] },
  { id: 'audit', label: 'Auditoria', icon: ShieldAlert, permission: 'audit:read', section: 'gestao' },
];

/** Hashes antigos que continuam funcionando (links salvos/favoritos). */
export const NAV_ALIASES: Record<string, string> = {
  'search-reports': 'reports',
};
