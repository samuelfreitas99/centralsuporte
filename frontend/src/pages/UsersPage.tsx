import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/userService';
import { infrastructureService } from '@/services/infrastructureService';
import type { User, Role } from '@/types/auth';
import type { DepartmentItem } from '@/types/infrastructure';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { useToast } from '@/components/ui/Toast';
import { UserFormDrawer } from '@/components/users/UserFormDrawer';
import {
  Users,
  UserPlus,
  Search,
  Building2,
  CheckCircle2,
  XCircle,
  Edit2,
  ExternalLink,
  Power,
  RotateCcw,
} from 'lucide-react';

interface UsersPageProps {
  onSelectTab?: (tab: string) => void;
  onOpenProfile?: (userId: number) => void;
}

export const UsersPage: React.FC<UsersPageProps> = ({ onSelectTab, onOpenProfile }) => {
  const { user: currentUser, hasPermission } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const canWriteUsers = hasPermission('users:write');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [uList, dList, rList] = await Promise.all([
        userService.getUsers(),
        infrastructureService.getDepartments().catch(() => []),
        userService.getRoles().catch(() => []),
      ]);
      setUsers(uList);
      setDepartments(dList);
      setRoles(rList);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar lista de usuários.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Client-side filtering combining search, status, department and role
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Status Filter
      if (statusFilter === 'active' && !u.is_active) return false;
      if (statusFilter === 'inactive' && u.is_active) return false;

      // 2. Department Filter
      if (departmentFilter !== 'all') {
        const deptId = Number(departmentFilter);
        if (u.department_id !== deptId) return false;
      }

      // 3. Role Filter
      if (roleFilter !== 'all') {
        const roleId = Number(roleFilter);
        const hasMatchingRole =
          (u.roles && u.roles.some((r) => r.id === roleId)) ||
          u.role_id === roleId ||
          u.role?.id === roleId;
        if (!hasMatchingRole) return false;
      }

      // 4. Search Filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesUsername = u.username.toLowerCase().includes(term);
        const matchesEmail = u.email ? u.email.toLowerCase().includes(term) : false;
        const matchesFull = u.full_name ? u.full_name.toLowerCase().includes(term) : false;
        const matchesDisplay = u.display_name ? u.display_name.toLowerCase().includes(term) : false;
        const matchesJob = u.job_title ? u.job_title.toLowerCase().includes(term) : false;
        const matchesDept = u.department?.name ? u.department.name.toLowerCase().includes(term) : false;

        if (
          !matchesUsername &&
          !matchesEmail &&
          !matchesFull &&
          !matchesDisplay &&
          !matchesJob &&
          !matchesDept
        ) {
          return false;
        }
      }

      return true;
    });
  }, [users, statusFilter, departmentFilter, roleFilter, searchTerm]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setIsDrawerOpen(true);
  };

  const handleToggleActive = async (user: User) => {
    if (!canWriteUsers) return;

    if (user.id === currentUser?.id && user.is_active) {
      toastError('Operação não permitida', 'Você não pode desativar o próprio usuário logado.');
      return;
    }

    try {
      const updated = await userService.updateUser(user.id, {
        is_active: !user.is_active,
      });

      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: updated.is_active } : u)));

      toastSuccess(
        updated.is_active ? 'Usuário ativado' : 'Usuário desativado',
        `O status de ${updated.display_name || updated.username} foi alterado com sucesso.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao alterar status do usuário.';
      toastError('Erro ao atualizar status', msg);
    }
  };

  const handleNavigateToProfile = (userId: number) => {
    if (onOpenProfile) {
      onOpenProfile(userId);
    } else if (onSelectTab) {
      onSelectTab(`profile?id=${userId}`);
    } else {
      window.location.hash = `#profile?id=${userId}`;
    }
  };

  const handleUserSaved = (savedUser: User) => {
    setUsers((prev) => {
      const exists = prev.some((u) => u.id === savedUser.id);
      if (exists) {
        return prev.map((u) => (u.id === savedUser.id ? savedUser : u));
      }
      return [savedUser, ...prev];
    });
  };

  const formatLastLogin = (dateStr?: string | null) => {
    if (!dateStr) return 'Nunca';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (errorMsg) {
    return (
      <ErrorState
        title="Erro ao carregar usuários"
        message={errorMsg}
        onRetry={loadData}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-heading font-bold text-foreground tracking-tight">
              Usuários
            </h2>
            <Badge variant="outline" className="font-mono text-xs border-border/70 text-muted-foreground">
              {filteredUsers.length} de {users.length}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerenciamento de operadores, papéis de acesso (RBAC) e identidades operacionais.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            title="Recarregar lista"
            className="h-9 gap-1.5 cursor-pointer border-border/70 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          {canWriteUsers && (
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="h-9 gap-1.5 cursor-pointer shadow-xs"
            >
              <UserPlus className="h-4 w-4" />
              <span>Novo Usuário</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <Card className="border-border/70 bg-card/60 backdrop-blur-xs">
        <CardContent className="p-3.5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, login, e-mail, cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs h-9 bg-background/80"
              />
            </div>

            {/* Filter Pills / Selects */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <div className="flex items-center rounded-lg border border-border/70 bg-muted/20 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-background shadow-xs text-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    statusFilter === 'active'
                      ? 'bg-background shadow-xs text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Ativos
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    statusFilter === 'inactive'
                      ? 'bg-background shadow-xs text-rose-600 dark:text-rose-400 font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Inativos
                </button>
              </div>

              {/* Department Select */}
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background/80 px-2.5 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Filtrar por Departamento"
              >
                <option value="all">Todos os Departamentos</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              {/* Role Select */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background/80 px-2.5 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Filtrar por Papel de Acesso"
              >
                <option value="all">Todos os Papéis</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>

              {(searchTerm || statusFilter !== 'all' || departmentFilter !== 'all' || roleFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setDepartmentFilter('all');
                    setRoleFilter('all');
                  }}
                  className="h-9 text-xs text-muted-foreground hover:text-foreground"
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Content: Desktop Table & Mobile Cards */}
      {filteredUsers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={
            searchTerm || statusFilter !== 'all' || departmentFilter !== 'all' || roleFilter !== 'all'
              ? 'Nenhum usuário corresponde aos filtros'
              : 'Nenhum usuário cadastrado'
          }
          description={
            searchTerm || statusFilter !== 'all' || departmentFilter !== 'all' || roleFilter !== 'all'
              ? 'Tente ajustar os critérios de pesquisa ou limpar os filtros ativos.'
              : 'Clique em "Novo Usuário" para cadastrar o primeiro analista no sistema.'
          }
        />
      ) : (
        <>
          {/* Desktop Dense Table */}
          <div className="hidden md:block rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[280px]">Usuário / Identidade</TableHead>
                  <TableHead>Cargo / Setor</TableHead>
                  <TableHead>Papéis de Acesso</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[130px]">Último Acesso</TableHead>
                  <TableHead className="w-[140px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => {
                  const userRoles = u.roles && u.roles.length > 0 ? u.roles : u.role ? [u.role] : [];
                  const isCurrent = u.id === currentUser?.id;

                  return (
                    <TableRow key={u.id} className="hover:bg-muted/30 transition-colors">
                      {/* Identity & Avatar */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={u.avatar_url}
                            name={u.display_name || u.full_name || u.username}
                            size="md"
                            status={u.is_active ? 'active' : 'inactive'}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-xs text-foreground truncate">
                                {u.display_name || u.username}
                              </span>
                              {isCurrent && (
                                <Badge variant="secondary" className="text-[10px] py-0 px-1 font-mono">
                                  Você
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                              <span className="font-mono">@{u.username}</span>
                              {u.email && <span>• {u.email}</span>}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Cargo / Setor */}
                      <TableCell className="py-3 text-xs">
                        <div className="space-y-0.5">
                          <span className="text-foreground font-medium block truncate">
                            {u.job_title || 'Não informado'}
                          </span>
                          {u.department ? (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                              <Building2 className="h-3 w-3 shrink-0" />
                              <span>{u.department.name}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/60 italic">
                              Sem setor
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Papéis */}
                      <TableCell className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {userRoles.length > 0 ? (
                            userRoles.map((r) => (
                              <Badge
                                key={r.id}
                                variant="outline"
                                className="font-mono text-[10px] border-border/70 text-foreground/90 py-0 px-1.5"
                              >
                                {r.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground/60 italic">Nenhum</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3">
                        {u.is_active ? (
                          <Badge variant="success" className="text-[10px] flex items-center gap-1 w-fit py-0 px-1.5">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Ativo</span>
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] flex items-center gap-1 w-fit py-0 px-1.5">
                            <XCircle className="h-3 w-3" />
                            <span>Inativo</span>
                          </Badge>
                        )}
                      </TableCell>

                      {/* Último Acesso */}
                      <TableCell className="py-3 text-[11px] text-muted-foreground font-mono">
                        {formatLastLogin(u.last_login_at)}
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleNavigateToProfile(u.id)}
                            title="Ver Perfil"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span className="sr-only">Ver Perfil</span>
                          </Button>

                          {canWriteUsers && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(u)}
                                title="Editar Cadastro"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                <Edit2 className="h-4 w-4" />
                                <span className="sr-only">Editar Usuário</span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleActive(u)}
                                disabled={isCurrent && u.is_active}
                                title={
                                  isCurrent && u.is_active
                                    ? 'Não é permitido desativar a própria conta'
                                    : u.is_active
                                    ? 'Desativar usuário'
                                    : 'Ativar usuário'
                                }
                                className={`h-8 w-8 cursor-pointer ${
                                  u.is_active
                                    ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                                    : 'text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10'
                                }`}
                              >
                                <Power className="h-4 w-4" />
                                <span className="sr-only">Alterar Status</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards Layout */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredUsers.map((u) => {
              const userRoles = u.roles && u.roles.length > 0 ? u.roles : u.role ? [u.role] : [];
              const isCurrent = u.id === currentUser?.id;

              return (
                <Card key={u.id} className="border-border/70 bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={u.avatar_url}
                        name={u.display_name || u.full_name || u.username}
                        size="md"
                        status={u.is_active ? 'active' : 'inactive'}
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-foreground">
                            {u.display_name || u.username}
                          </span>
                          {isCurrent && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1 font-mono">
                              Você
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono">@{u.username}</p>
                      </div>
                    </div>

                    {u.is_active ? (
                      <Badge variant="success" className="text-[10px] py-0 px-1.5">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                        Inativo
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 text-xs border-t border-border/50 pt-2 text-muted-foreground">
                    {u.job_title && (
                      <p className="text-foreground font-medium">{u.job_title}</p>
                    )}
                    {u.department && (
                      <p className="flex items-center gap-1 text-[11px]">
                        <Building2 className="h-3 w-3" />
                        <span>{u.department.name}</span>
                      </p>
                    )}
                    {u.email && <p className="text-[11px] select-all">{u.email}</p>}
                  </div>

                  {/* Roles */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {userRoles.map((r) => (
                      <Badge
                        key={r.id}
                        variant="outline"
                        className="font-mono text-[10px] border-border/70 py-0 px-1.5"
                      >
                        {r.name}
                      </Badge>
                    ))}
                  </div>

                  {/* Mobile Actions */}
                  <div className="flex items-center justify-end gap-2 border-t border-border/50 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleNavigateToProfile(u.id)}
                      className="text-xs h-8 gap-1.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Perfil</span>
                    </Button>

                    {canWriteUsers && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(u)}
                        className="text-xs h-8 gap-1.5"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Editar</span>
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Admin User Form Drawer */}
      <UserFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={handleUserSaved}
        userToEdit={editingUser}
        currentUserId={currentUser?.id}
      />
    </div>
  );
};
