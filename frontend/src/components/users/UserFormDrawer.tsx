import React, { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/Avatar';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/Toast';
import { userService } from '@/services/userService';
import { infrastructureService } from '@/services/infrastructureService';
import type { User, Role } from '@/types/auth';
import type { DepartmentItem } from '@/types/infrastructure';
import { Loader2, Shield, Building2, User as UserIcon, Lock, Mail, Phone, Briefcase } from 'lucide-react';

interface UserFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedUser: User) => void;
  userToEdit?: User | null;
  currentUserId?: number;
}

export const UserFormDrawer: React.FC<UserFormDrawerProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userToEdit,
  currentUserId,
}) => {
  const { success: toastSuccess, error: toastError } = useToast();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [preferences, setPreferences] = useState('');

  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = !!userToEdit;
  const isEditingSelf = isEdit && userToEdit.id === currentUserId;

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadAuxData() {
      setLoadingData(true);
      try {
        const [depts, rList] = await Promise.all([
          infrastructureService.getDepartments().catch(() => []),
          userService.getRoles().catch(() => []),
        ]);
        if (isMounted) {
          setDepartments(depts);
          setRoles(rList);
        }
      } catch (err: unknown) {
        console.error('Falha ao carregar departamentos ou papéis', err);
      } finally {
        if (isMounted) setLoadingData(false);
      }
    }

    loadAuxData();

    if (userToEdit) {
      setUsername(userToEdit.username || '');
      setEmail(userToEdit.email || '');
      setPassword('');
      setFullName(userToEdit.full_name || '');
      setDisplayName(userToEdit.display_name || '');
      setPhone(userToEdit.phone || '');
      setJobTitle(userToEdit.job_title || '');
      setAvatarUrl(userToEdit.avatar_url || '');
      setDepartmentId(userToEdit.department_id ?? null);
      
      const roleIds: number[] = [];
      if (userToEdit.roles && userToEdit.roles.length > 0) {
        userToEdit.roles.forEach((r) => roleIds.push(r.id));
      } else if (userToEdit.role_id) {
        roleIds.push(userToEdit.role_id);
      } else if (userToEdit.role?.id) {
        roleIds.push(userToEdit.role.id);
      }
      setSelectedRoleIds(roleIds);
      setIsActive(userToEdit.is_active ?? true);
      setPreferences(userToEdit.preferences || '');
    } else {
      setUsername('');
      setEmail('');
      setPassword('');
      setFullName('');
      setDisplayName('');
      setPhone('');
      setJobTitle('');
      setAvatarUrl('');
      setDepartmentId(null);
      setSelectedRoleIds([]);
      setIsActive(true);
      setPreferences('');
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, userToEdit]);

  const toggleRole = (roleId: number) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEdit && (!username.trim() || !password)) {
      toastError('Campos obrigatórios', 'Nome de usuário e senha são obrigatórios.');
      return;
    }

    if (!email.trim()) {
      toastError('Campos obrigatórios', 'O e-mail é obrigatório.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEdit && userToEdit) {
        const payload: {
          email?: string;
          password?: string;
          full_name?: string;
          display_name?: string;
          avatar_url?: string;
          phone?: string;
          job_title?: string;
          department_id?: number | null;
          preferences?: string;
          role_ids?: number[];
          is_active?: boolean;
        } = {
          email: email.trim(),
          full_name: fullName.trim() || undefined,
          display_name: displayName.trim() || undefined,
          avatar_url: avatarUrl.trim() || undefined,
          phone: phone.trim() || undefined,
          job_title: jobTitle.trim() || undefined,
          department_id: departmentId,
          preferences: preferences.trim() || undefined,
          role_ids: selectedRoleIds,
          is_active: isActive,
        };

        if (password.trim()) {
          payload.password = password.trim();
        }

        const updated = await userService.updateUser(userToEdit.id, payload);
        toastSuccess('Usuário atualizado', `Dados de ${updated.display_name || updated.username} atualizados com sucesso.`);
        onSuccess(updated);
        onClose();
      } else {
        const payload = {
          username: username.trim(),
          email: email.trim(),
          password: password.trim(),
          full_name: fullName.trim() || undefined,
          display_name: displayName.trim() || undefined,
          avatar_url: avatarUrl.trim() || undefined,
          phone: phone.trim() || undefined,
          job_title: jobTitle.trim() || undefined,
          department_id: departmentId,
          preferences: preferences.trim() || undefined,
          role_ids: selectedRoleIds,
          is_active: isActive,
        };

        const created = await userService.createUser(payload);
        toastSuccess('Usuário cadastrado', `Usuário ${created.display_name || created.username} criado com sucesso.`);
        onSuccess(created);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar usuário.';
      toastError('Erro ao salvar', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent size="lg" className="overflow-y-auto">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DrawerHeader>
            <DrawerTitle className="font-heading">
              {isEdit ? 'Editar Usuário' : 'Novo Usuário'}
            </DrawerTitle>
            <DrawerDescription>
              {isEdit
                ? 'Atualize os dados cadastrais, cargo, departamento e papéis de acesso do usuário.'
                : 'Preencha as informações para cadastrar um novo operador ou analista na Central.'}
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 space-y-6 py-4 px-1">
            {/* Avatar & Visual Preview */}
            <div className="flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-muted/20">
              <Avatar
                src={avatarUrl}
                name={displayName || fullName || username || 'Novo Usuário'}
                size="lg"
                status={isActive ? 'active' : 'inactive'}
              />
              <div className="flex-1 space-y-1">
                <Label htmlFor="avatar-url-input" className="text-xs font-semibold text-foreground">
                  URL da Foto / Avatar
                </Label>
                <Input
                  id="avatar-url-input"
                  placeholder="https://exemplo.com/avatar.jpg"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Deixe vazio para usar o fallback automático com iniciais.
                </p>
              </div>
            </div>

            {/* Identificação Básica */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Credenciais e Identidade
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs flex items-center gap-1.5">
                    <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Nome de Usuário (Login) *</span>
                  </Label>
                  <Input
                    id="username"
                    required={!isEdit}
                    disabled={isEdit}
                    placeholder="ex: jsilva"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  {isEdit && (
                    <p className="text-[10px] text-muted-foreground">
                      O login de usuário é imutável após a criação.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>E-mail Corporativo *</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="ex: jsilva@empresa.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs">
                    Nome Completo
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="ex: João da Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="displayName" className="text-xs">
                    Nome de Exibição
                  </Label>
                  <Input
                    id="displayName"
                    placeholder="ex: João Silva"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{isEdit ? 'Nova Senha (Opcional)' : 'Senha de Acesso *'}</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    required={!isEdit}
                    placeholder={isEdit ? 'Deixe em branco para manter' : '••••••••'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Telefone / Ramal</span>
                  </Label>
                  <Input
                    id="phone"
                    placeholder="ex: (11) 98765-4321 / Ramal 204"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Organização & Atribuição */}
            <div className="space-y-4 pt-2 border-t border-border/60">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Setor e Cargo
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="jobTitle" className="text-xs flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Cargo / Função</span>
                  </Label>
                  <Input
                    id="jobTitle"
                    placeholder="ex: Analista de Suporte N2"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="department" className="text-xs flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Departamento / Setor</span>
                  </Label>
                  <select
                    id="department"
                    value={departmentId ?? ''}
                    onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : null)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Nenhum departamento vinculado</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Papéis de Acesso (Multi-Role) */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <span>Papéis de Acesso (RBAC M:N)</span>
                </h4>
                {loadingData && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
              <p className="text-xs text-muted-foreground">
                O usuário herdará a união das permissões de todos os papéis selecionados.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {roles.map((r) => {
                  const isChecked = selectedRoleIds.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRole(r.id)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                        isChecked
                          ? 'border-primary/50 bg-primary/10 text-foreground'
                          : 'border-border/60 bg-muted/10 text-muted-foreground hover:bg-muted/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by button click
                        className="mt-0.5 rounded border-border/60 text-primary focus:ring-primary h-4 w-4"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-xs text-foreground block truncate">
                          {r.name}
                        </span>
                        {r.description && (
                          <span className="text-[11px] text-muted-foreground line-clamp-1">
                            {r.description}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status Ativo / Inativo */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
              <div>
                <Label htmlFor="active-toggle" className="font-semibold text-xs text-foreground block">
                  Status da Conta
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {isEditingSelf
                    ? 'Você não pode desativar a própria conta enquanto estiver logado.'
                    : isActive
                    ? 'Usuário ativo tem permissão para autenticar e operar o sistema.'
                    : 'Usuário inativo é bloqueado de fazer login e executar requisições.'}
                </p>
              </div>
              <Switch
                id="active-toggle"
                checked={isActive}
                disabled={isEditingSelf}
                onCheckedChange={setIsActive}
              />
            </div>

            {/* Preferências / Observações */}
            <div className="space-y-1.5 pt-2 border-t border-border/60">
              <Label htmlFor="preferences" className="text-xs">
                Preferências / Observações Internas
              </Label>
              <Textarea
                id="preferences"
                placeholder="Preferências de notificação, tema ou notas internas..."
                rows={2}
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
              />
            </div>
          </div>

          <DrawerFooter className="pt-4 border-t border-border/60 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{isEdit ? 'Salvar Alterações' : 'Criar Usuário'}</span>
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
};
