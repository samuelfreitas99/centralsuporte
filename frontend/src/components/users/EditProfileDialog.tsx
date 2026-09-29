import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { userService } from '@/services/userService';
import { useAuth } from '@/hooks/useAuth';
import type { UserProfileResponse } from '@/types/auth';
import { Loader2, Phone, Smile } from 'lucide-react';

interface EditProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedProfile: UserProfileResponse) => void;
  currentProfile?: UserProfileResponse | null;
}

export const EditProfileDialog: React.FC<EditProfileDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentProfile,
}) => {
  const { user, refreshUser } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [preferences, setPreferences] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (currentProfile) {
      setDisplayName(currentProfile.display_name || '');
      setAvatarUrl(currentProfile.avatar_url || '');
      setPhone(currentProfile.phone || '');
      setPreferences(currentProfile.preferences || '');
    } else if (user) {
      setDisplayName(user.display_name || user.username || '');
      setAvatarUrl(user.avatar_url || '');
      setPhone(user.phone || '');
      setPreferences(user.preferences || '');
    }
  }, [isOpen, currentProfile, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Send ONLY allowed self-update fields
      const payload = {
        display_name: displayName.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
        phone: phone.trim() || undefined,
        preferences: preferences.trim() || undefined,
      };

      const updated = await userService.updateMyProfile(payload);
      
      // Update global auth state so Header and Sidebar reflect changes immediately
      await refreshUser?.();

      toastSuccess('Perfil atualizado', 'Suas informações de perfil foram salvas com sucesso.');
      if (onSuccess) {
        onSuccess(updated);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao atualizar perfil.';
      toastError('Erro ao salvar', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="default" className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="font-heading">Editar Meu Perfil</DialogTitle>
            <DialogDescription>
              Personalize seu nome de exibição, foto de avatar e preferências de uso.
            </DialogDescription>
          </DialogHeader>

          {/* Avatar Preview */}
          <div className="flex items-center gap-4 p-3 rounded-xl border border-border/60 bg-muted/20">
            <Avatar
              src={avatarUrl}
              name={displayName || user?.username || 'Eu'}
              size="lg"
              status="active"
            />
            <div className="flex-1 space-y-1">
              <Label htmlFor="self-avatar-url" className="text-xs font-semibold text-foreground">
                URL da Foto de Avatar
              </Label>
              <Input
                id="self-avatar-url"
                placeholder="https://exemplo.com/minha-foto.jpg"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Insira o link para a sua imagem corporativa ou foto.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="self-display-name" className="text-xs flex items-center gap-1.5">
                <Smile className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Nome de Exibição</span>
              </Label>
              <Input
                id="self-display-name"
                placeholder="Como você prefere ser chamado(a)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="self-phone" className="text-xs flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Telefone de Contato / Ramal</span>
              </Label>
              <Input
                id="self-phone"
                placeholder="ex: (11) 98765-4321 / Ramal 105"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="self-preferences" className="text-xs">
                Preferências e Observações Pessoais
              </Label>
              <Textarea
                id="self-preferences"
                placeholder="Ex: preferência por contato via ramal pela manhã..."
                rows={3}
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border/50 bg-muted/10 p-2.5 text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground block mb-0.5">Campos protegidos:</span>
            E-mail, cargo, departamento, papéis de acesso e status ativo só podem ser alterados por um administrador do sistema.
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
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
              <span>Salvar Perfil</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
