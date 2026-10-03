import React from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import type { StandardResponseCreateInput } from '@/types/commands';

interface ResponseFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  form: StandardResponseCreateInput;
  setForm: React.Dispatch<React.SetStateAction<StandardResponseCreateInput>>;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

/** Formulário de resposta padrão (novo/edição). */
export const ResponseFormDrawer: React.FC<ResponseFormDrawerProps> = ({ open, onOpenChange, isEditing, form, setForm, isSubmitting, onSubmit }) => (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent size="lg" side="right">
        <form onSubmit={onSubmit} className="space-y-4 overflow-y-auto max-h-[85vh] px-4 pb-8 custom-scrollbar">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2 font-heading">
              <MessageSquare className="h-5 w-5 text-blue-400" />
              <span>{isEditing ? 'Editar Resposta Padrão' : 'Nova Resposta Padrão'}</span>
            </DrawerTitle>
            <DrawerDescription>
              Crie modelos de respostas para padronizar e agilizar a comunicação técnica.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-3.5 text-sm">
            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Identificador / Título da Resposta *
              </label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Orientação de Reinício de Roteador ou Abertura de Chamado OTRS"
                required
              />
            </div>

            {/* Content Area */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Texto da Mensagem *
              </label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={6}
                required
                placeholder="Olá [Nome], identificamos que... Favor reiniciar o equipamento..."
                className="w-full rounded-xl border border-border/80 bg-background/60 p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed font-sans"
              />
            </div>

            {/* Audience and Category Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Público-Alvo
                </label>
                <select
                  value={form.audience || 'usuario_final'}
                  onChange={(e) => setForm({ ...form, audience: e.target.value })}
                  className="w-full h-9 rounded-lg border border-border/80 bg-background/60 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="usuario_final">Usuário Final</option>
                  <option value="tecnico">Equipe Técnica / Interna</option>
                  <option value="fornecedor">Fornecedor / Terceiro</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Categoria
                </label>
                <Input
                  value={form.category || ''}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Atendimento, Manutenção, Orientação..."
                />
              </div>
            </div>

            {/* Tags and Visibility Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Tags (separadas por vírgula)
                </label>
                <Input
                  value={form.tags || ''}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="atendimento, reinicio, orientacao"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Visibilidade
                </label>
                <select
                  value={form.visibility || 'equipe'}
                  onChange={(e) => setForm({ ...form, visibility: e.target.value })}
                  className="w-full h-9 rounded-lg border border-border/80 bg-background/60 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="equipe">Visível para toda a equipe</option>
                  <option value="privado">Apenas eu (Privado)</option>
                </select>
              </div>
            </div>
          </div>

          <DrawerFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
              {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Resposta'}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
);
