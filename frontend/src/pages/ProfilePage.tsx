import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/userService';
import type { UserProfileResponse, UserStatsResponse, User } from '@/types/auth';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EditProfileDialog } from '@/components/users/EditProfileDialog';
import { UserFormDrawer } from '@/components/users/UserFormDrawer';
import {
  ArrowLeft,
  Edit3,
  Shield,
  Building2,
  Briefcase,
  Mail,
  Calendar,
  CheckSquare,
  Headset,
  Wrench,
  BookOpen,
  Lock,
  UserCheck,
  UserX,
  Settings,
} from 'lucide-react';

interface ProfilePageProps {
  userId?: number | null;
  onBack?: () => void;
  onSelectTab?: (tab: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  userId,
  onBack,
  onSelectTab,
}) => {
  const { user: currentUser, hasPermission } = useAuth();

  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dialog / Drawer states
  const [isSelfEditDialogOpen, setIsSelfEditDialogOpen] = useState(false);
  const [isAdminEditDialogOpen, setIsAdminEditDialogOpen] = useState(false);

  // Target ID: if userId prop is provided and > 0, use it; otherwise fallback to currentUser.id
  const targetId = userId && userId > 0 ? userId : currentUser?.id;
  const isSelf = !!currentUser && currentUser.id === targetId;
  const canEditAdmin = hasPermission('users:write');

  const loadProfileData = useCallback(async () => {
    if (!targetId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const [profileData, statsData] = await Promise.all([
        isSelf ? userService.getMyProfile() : userService.getUserProfile(targetId),
        userService.getUserStats(targetId).catch(() => null),
      ]);

      setProfile(profileData);
      setStats(statsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar dados do perfil.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  }, [targetId, isSelf]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (errorMsg || !profile) {
    return (
      <div className="space-y-4">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </Button>
        )}
        <ErrorState
          title="Erro ao carregar perfil"
          message={errorMsg || 'Perfil de usuário não encontrado.'}
          onRetry={loadProfileData}
        />
      </div>
    );
  }

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Nunca acessou';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleAdminSuccess = (saved: User) => {
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            ...saved,
            roles: saved.roles || prev.roles,
          }
        : null
    );
  };

  const handleSelfSuccess = (updated: UserProfileResponse) => {
    setProfile(updated);
  };

  return (
    <div className="space-y-6">
      {/* Navigation / Back Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar</span>
            </Button>
          ) : onSelectTab ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectTab('users')}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar para Usuários</span>
            </Button>
          ) : null}

          <h2 className="text-xl font-heading font-bold text-foreground tracking-tight">
            {isSelf ? 'Meu Perfil' : `Perfil de ${profile.display_name || profile.username}`}
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isSelf && (
            <Button
              onClick={() => setIsSelfEditDialogOpen(true)}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="h-4 w-4" />
              <span>Editar Meu Perfil</span>
            </Button>
          )}

          {!isSelf && canEditAdmin && (
            <Button
              variant="outline"
              onClick={() => setIsAdminEditDialogOpen(true)}
              className="flex items-center gap-1.5 cursor-pointer border-border/70 hover:bg-muted/40"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span>Editar Usuário (Admin)</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Profile Header Card */}
      <Card className="border-border/70 bg-card/75 backdrop-blur-md overflow-hidden">
        <div className="h-16 bg-gradient-to-r from-primary/10 via-primary/5 to-muted/20 border-b border-border/40" />
        <CardContent className="pt-0 pb-6 px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10 sm:-mt-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <Avatar
                src={profile.avatar_url}
                name={profile.display_name || profile.full_name || profile.username}
                size="2xl"
                status={profile.is_active ? 'active' : 'inactive'}
                className="ring-4 ring-card shadow-md"
              />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-heading font-bold text-foreground">
                    {profile.display_name || profile.username}
                  </h3>
                  {profile.full_name && profile.full_name !== profile.display_name && (
                    <span className="text-sm text-muted-foreground">({profile.full_name})</span>
                  )}
                  {profile.is_active ? (
                    <Badge variant="success" className="text-[11px] font-medium flex items-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      <span>Ativo</span>
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[11px] font-medium flex items-center gap-1">
                      <UserX className="h-3 w-3" />
                      <span>Inativo</span>
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-medium">
                  <span className="font-mono text-foreground/80">@{profile.username}</span>

                  {profile.job_title && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{profile.job_title}</span>
                    </span>
                  )}

                  {profile.department && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{profile.department.name}</span>
                    </span>
                  )}

                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Último acesso: {formatDateTime(profile.last_login_at)}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Roles Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              {profile.roles && profile.roles.length > 0 ? (
                profile.roles.map((role) => (
                  <Badge
                    key={role.id}
                    variant="outline"
                    className="flex items-center gap-1 font-mono text-xs border-primary/20 bg-primary/10 text-primary py-0.5 px-2"
                  >
                    <Shield className="h-3 w-3" />
                    <span>{role.name}</span>
                  </Badge>
                ))
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Sem papel atribuído
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operational Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <Card className="border-border/60 bg-card/60 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold">Tarefas em Aberto</span>
            <CheckSquare className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-heading text-foreground">
            {stats ? stats.open_tasks : 0}
          </div>
          <span className="text-[10px] text-muted-foreground mt-1">pendentes / em andamento</span>
        </Card>

        <Card className="border-border/60 bg-card/60 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold">Atendimentos Resolvidos</span>
            <Headset className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-heading text-foreground">
            {stats ? stats.resolved_attendances : 0}
          </div>
          <span className="text-[10px] text-muted-foreground mt-1">concluídos com sucesso</span>
        </Card>

        <Card className="border-border/60 bg-card/60 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold">Projetos Ativos</span>
            <Briefcase className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-heading text-foreground">
            {stats ? stats.active_projects : 0}
          </div>
          <span className="text-[10px] text-muted-foreground mt-1">planejados / em curso</span>
        </Card>

        <Card className="border-border/60 bg-card/60 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold">Manutenções Concluídas</span>
            <Wrench className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-heading text-foreground">
            {stats ? stats.completed_maintenances : 0}
          </div>
          <span className="text-[10px] text-muted-foreground mt-1">intervenções técnicas</span>
        </Card>

        <Card className="border-border/60 bg-card/60 p-4 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold">Artigos Publicados</span>
            <BookOpen className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold font-heading text-foreground">
            {stats ? stats.authored_articles : 0}
          </div>
          <span className="text-[10px] text-muted-foreground mt-1">base de conhecimento</span>
        </Card>
      </div>

      {/* Details Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contato & Identificação */}
        <Card className="border-border/70 bg-card/75 backdrop-blur-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold font-heading flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <span>Contato & Identificação Corporativa</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between py-2 border-b border-border/40">
                <span className="text-xs text-muted-foreground font-medium">E-mail</span>
                {profile.email ? (
                  <span className="text-xs font-medium text-foreground select-all">
                    {profile.email}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/60 italic flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Informação restrita
                  </span>
                )}
              </div>

              <div className="flex items-start justify-between py-2 border-b border-border/40">
                <span className="text-xs text-muted-foreground font-medium">Telefone / Ramal</span>
                {profile.phone ? (
                  <span className="text-xs font-medium text-foreground">{profile.phone}</span>
                ) : (
                  <span className="text-xs text-muted-foreground/60 italic">
                    Não informado
                  </span>
                )}
              </div>

              <div className="flex items-start justify-between py-2 border-b border-border/40">
                <span className="text-xs text-muted-foreground font-medium">Cargo / Função</span>
                <span className="text-xs font-medium text-foreground">
                  {profile.job_title || 'Não especificado'}
                </span>
              </div>

              <div className="flex items-start justify-between py-2 border-b border-border/40">
                <span className="text-xs text-muted-foreground font-medium">Departamento</span>
                <span className="text-xs font-medium text-foreground">
                  {profile.department?.name || 'Não vinculado'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sistema, Permissões e Preferências */}
        <Card className="border-border/70 bg-card/75 backdrop-blur-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold font-heading flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span>Acesso ao Sistema & Configurações</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between py-2 border-b border-border/40">
                <span className="text-xs text-muted-foreground font-medium">ID do Usuário</span>
                <span className="text-xs font-mono text-foreground font-semibold">
                  #{profile.id}
                </span>
              </div>

              <div className="flex items-start justify-between py-2 border-b border-border/40">
                <span className="text-xs text-muted-foreground font-medium">Status no Sistema</span>
                <span className="text-xs font-medium text-foreground">
                  {profile.is_active ? 'Conta habilitada (Login ativo)' : 'Conta desativada'}
                </span>
              </div>

              <div className="py-2 border-b border-border/40 space-y-1.5">
                <span className="text-xs text-muted-foreground font-medium block">
                  Papéis Atribuídos
                </span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {profile.roles && profile.roles.length > 0 ? (
                    profile.roles.map((r) => (
                      <span
                        key={r.id}
                        className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-foreground"
                      >
                        {r.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      Nenhum papel atribuído
                    </span>
                  )}
                </div>
              </div>

              <div className="py-2 space-y-1.5">
                <span className="text-xs text-muted-foreground font-medium block">
                  Preferências Pessoais / Observações
                </span>
                {profile.preferences ? (
                  <div className="p-2.5 rounded-lg border border-border/50 bg-muted/20 text-xs text-foreground/90 whitespace-pre-wrap font-sans leading-relaxed">
                    {profile.preferences}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground/60 italic block">
                    Nenhuma preferência registrada.
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals & Drawers */}
      <EditProfileDialog
        isOpen={isSelfEditDialogOpen}
        onClose={() => setIsSelfEditDialogOpen(false)}
        onSuccess={handleSelfSuccess}
        currentProfile={profile}
      />

      <UserFormDrawer
        isOpen={isAdminEditDialogOpen}
        onClose={() => setIsAdminEditDialogOpen(false)}
        onSuccess={handleAdminSuccess}
        userToEdit={profile as unknown as User}
        currentUserId={currentUser?.id}
      />
    </div>
  );
};
