import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { roleService } from '@/services/roleService';
import type { Role, Permission } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/Toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export const RolesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', permission_ids: [] as number[] });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [rList, pList] = await Promise.all([
        roleService.getRoles(),
        roleService.getPermissions()
      ]);
      setRoles(rList);
      setPermissions(pList);
    } catch (error) {
      toastError('Erro', 'Não foi possível carregar perfis e permissões.');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const canWrite = hasPermission('roles:write');

  const handleOpenModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        description: role.description || '',
        permission_ids: role.permissions?.map(p => p.id) || []
      });
    } else {
      setEditingRole(null);
      setFormData({ name: '', description: '', permission_ids: [] });
    }
    setIsModalOpen(true);
  };

  const togglePermission = (permId: number) => {
    setFormData(prev => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permId)
        ? prev.permission_ids.filter(id => id !== permId)
        : [...prev.permission_ids, permId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setIsSubmitting(true);
    try {
      if (editingRole) {
        await roleService.updateRole(editingRole.id, formData);
        toastSuccess('Perfil atualizado', `Perfil ${formData.name} atualizado com sucesso.`);
      } else {
        await roleService.createRole(formData);
        toastSuccess('Perfil criado', `Perfil ${formData.name} criado com sucesso.`);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toastError('Erro', err?.message || 'Falha ao salvar perfil.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Perfis e permissões</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Marque o que cada perfil pode ver e alterar.</p>
        </div>
        {canWrite && (
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Perfil
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {roles.map(role => (
              <div key={role.id} className="bg-card border border-border/50 rounded-xl p-5 shadow-sm flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      {role.name}
                      {role.name === 'Administrador' && <Badge variant="default" className="text-[10px]">Protegido</Badge>}
                    </h3>
                    {role.description && <p className="text-sm text-muted-foreground mt-1">{role.description}</p>}
                  </div>
                  {canWrite && (
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(role)}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
                
                <div className="flex-1 bg-muted/30 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Permissões Efetivas</h4>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions && role.permissions.length > 0 ? (
                      role.permissions.map(p => (
                        <div key={p.id} title={p.description}>
                          <Badge variant="secondary" className="font-normal text-xs">
                            {p.name}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Nenhuma permissão associada</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Editar Perfil' : 'Novo Perfil'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do Perfil</label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData(prev => ({...prev, name: e.target.value}))} 
                  required 
                  disabled={editingRole?.name === 'Administrador'}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição</label>
                <Input 
                  value={formData.description} 
                  onChange={e => setFormData(prev => ({...prev, description: e.target.value}))} 
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border/40">
              <h4 className="text-sm font-medium mb-3">Matriz de Permissões</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {permissions.map(p => (
                  <label key={p.id} className="flex items-start gap-2 p-2 rounded border border-border/50 bg-card hover:bg-muted/30 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="mt-1"
                      checked={formData.permission_ids.includes(p.id)}
                      onChange={() => togglePermission(p.id)}
                      disabled={editingRole?.name === 'Administrador' && p.name === 'roles:write'}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground leading-tight">{p.name}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{p.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
                {isSubmitting ? 'Salvando...' : 'Salvar Perfil'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
