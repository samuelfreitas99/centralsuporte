import React from 'react';
import { Terminal, Plus, AlertTriangle, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import type { CommandCreateInput } from '@/types/commands';

interface CommandFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  form: CommandCreateInput;
  setForm: React.Dispatch<React.SetStateAction<CommandCreateInput>>;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

/** Formulário de comando multi-passo (novo/edição). */
export const CommandFormDrawer: React.FC<CommandFormDrawerProps> = ({ open, onOpenChange, isEditing, form, setForm, isSubmitting, onSubmit }) => (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent size="lg" side="right">
        <form onSubmit={onSubmit} className="space-y-4 overflow-y-auto max-h-[85vh] px-4 pb-8 custom-scrollbar">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2 font-heading">
              <Terminal className="h-5 w-5 text-blue-400" />
              <span>{isEditing ? 'Editar Comando Operacional' : 'Novo Comando Operacional'}</span>
            </DrawerTitle>
            <DrawerDescription>
              Cadastre comandos técnicos úteis para diagnósticos e rotinas de suporte rápido.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-3.5 text-sm">
            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Título do Comando *
              </label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Liberar IP travado no DHCP ou Limpeza de cache DNS"
                required
              />
            </div>

            {/* Command Code Area (Steps) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">Passos do Procedimento *</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    const newSteps = [...form.steps, { position: form.steps.length + 1, title: `Passo ${form.steps.length + 1}`, command_text: '' }];
                    setForm({ ...form, steps: newSteps });
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Passo
                </Button>
              </div>
              
              {form.steps.map((step, index) => (
                <div key={index} className="rounded-xl border border-border/60 bg-muted/10 p-3 space-y-3 relative">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <Input
                        value={step.title}
                        onChange={(e) => {
                          const newSteps = [...form.steps];
                          newSteps[index].title = e.target.value;
                          setForm({ ...form, steps: newSteps });
                        }}
                        placeholder="Título do passo"
                        className="h-8 text-xs font-semibold"
                        required
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={index === 0}
                        onClick={() => {
                          const newSteps = [...form.steps];
                          [newSteps[index], newSteps[index - 1]] = [newSteps[index - 1], newSteps[index]];
                          newSteps.forEach((s, i) => s.position = i + 1);
                          setForm({ ...form, steps: newSteps });
                        }}
                        className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-foreground"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={index === form.steps.length - 1}
                        onClick={() => {
                          const newSteps = [...form.steps];
                          [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
                          newSteps.forEach((s, i) => s.position = i + 1);
                          setForm({ ...form, steps: newSteps });
                        }}
                        className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-foreground"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={form.steps.length === 1}
                        onClick={() => {
                          const newSteps = form.steps.filter((_, i) => i !== index);
                          newSteps.forEach((s, i) => s.position = i + 1);
                          setForm({ ...form, steps: newSteps });
                        }}
                        className="h-7 w-7 cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  
                  <textarea
                    value={step.description || ''}
                    onChange={(e) => {
                      const newSteps = [...form.steps];
                      newSteps[index].description = e.target.value;
                      setForm({ ...form, steps: newSteps });
                    }}
                    rows={1}
                    placeholder="Descrição opcional..."
                    className="w-full rounded-lg border border-border/80 bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />

                  <textarea
                    value={step.command_text}
                    onChange={(e) => {
                      const newSteps = [...form.steps];
                      newSteps[index].command_text = e.target.value;
                      setForm({ ...form, steps: newSteps });
                    }}
                    rows={2}
                    required
                    placeholder="Código do comando..."
                    className="w-full rounded-lg border border-border/80 bg-slate-950 p-2.5 font-mono text-xs text-blue-300 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              ))}
            </div>

            {/* System and Category Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Sistema Operacional / Plataforma
                </label>
                <Input
                  value={form.system || ''}
                  onChange={(e) => setForm({ ...form, system: e.target.value })}
                  placeholder="Linux, Windows, Mikrotik, Docker..."
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Categoria Operacional
                </label>
                <Input
                  value={form.category || ''}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Redes, Banco de Dados, Backup..."
                />
              </div>
            </div>

            {/* Warning notice (critical for support) */}
            <div>
              <label className="text-xs font-semibold text-warning mb-1 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Aviso de Atenção / Efeitos Colaterais (Opcional)</span>
              </label>
              <Input
                value={form.warning || ''}
                onChange={(e) => setForm({ ...form, warning: e.target.value })}
                placeholder="Ex: Reinicia a placa de rede por 5s ou Derruba conexões ativas"
                className="border-warning/40 bg-warning/10 text-foreground placeholder:text-foreground/50"
              />
            </div>

            {/* Notes / Context */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Instruções e Observações Técnicas
              </label>
              <textarea
                value={form.notes || ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Explicação dos parâmetros, quando utilizar, permissões necessárias..."
                className="w-full rounded-lg border border-border/80 bg-background/60 p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed"
              />
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
                  placeholder="dns, cache, rede, windows"
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
              {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Comando'}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
);
