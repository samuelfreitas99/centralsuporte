import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useConfirm } from '@/hooks/useConfirm';
import { motion, AnimatePresence } from 'motion/react';
import {
  Terminal,
  MessageSquare,
  Search,
  Plus,
  AlertTriangle,
  Layers,
  Users,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useDeepLinkId, clearDeepLinkId } from '@/hooks/useDeepLink';
import { CommandFormDrawer } from '@/components/commands/CommandFormDrawer';
import { CommandCard } from '@/components/commands/CommandCard';
import { ResponseCard } from '@/components/commands/ResponseCard';
import { ResponseFormDrawer } from '@/components/commands/ResponseFormDrawer';
import { commandService } from '@/services/commandService';
import { responseService } from '@/services/responseService';
import type {
  CommandItem,
  CommandCreateInput,
  StandardResponseItem,
  StandardResponseCreateInput,
} from '@/types/commands';

type ActiveTab = 'commands' | 'responses';


const copyToClipboard = async (text: string) => {
  if (!navigator.clipboard || !window.isSecureContext) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      throw err;
    } finally {
      textArea.remove();
    }
    return;
  }
  await navigator.clipboard.writeText(text);
};

export const CommandsPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>('commands');

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSystem, setSelectedSystem] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAudience, setSelectedAudience] = useState<string>('all');

  // Data states
  const [commands, setCommands] = useState<CommandItem[]>([]);
  const [responses, setResponses] = useState<StandardResponseItem[]>([]);
  const [availableSystems, setAvailableSystems] = useState<string[]>([]);
  const [commandCategories, setCommandCategories] = useState<string[]>([]);
  const [responseCategories, setResponseCategories] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Screen states
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dialog states
  const [isCommandDrawerOpen, setIsCommandDrawerOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState<CommandItem | null>(null);
  const [commandForm, setCommandForm] = useState<CommandCreateInput>({
    title: '',
    description: '',
    steps: [{ position: 1, title: 'Passo 1', command_text: '' }],
    system: 'Geral',
    category: '',
    tags: '',
    notes: '',
    warning: '',
    visibility: 'equipe',
  });

  const [isResponseDrawerOpen, setIsResponseDrawerOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<StandardResponseItem | null>(null);
  const [responseForm, setResponseForm] = useState<StandardResponseCreateInput>({
    title: '',
    content: '',
    category: '',
    audience: 'usuario_final',
    tags: '',
    visibility: 'equipe',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Commands
  const loadCommands = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [cmds, systems, cats] = await Promise.all([
        commandService.getCommands({
          system: selectedSystem !== 'all' ? selectedSystem : undefined,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          search: searchQuery || undefined,
        }),
        commandService.getSystems(),
        commandService.getCategories(),
      ]);
      setCommands(cmds);
      setAvailableSystems(systems);
      setCommandCategories(cats);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar comandos';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSystem, selectedCategory, searchQuery]);

  // Load Responses
  const loadResponses = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [resps, cats] = await Promise.all([
        responseService.getResponses({
          audience: selectedAudience !== 'all' ? selectedAudience : undefined,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          search: searchQuery || undefined,
        }),
        responseService.getCategories(),
      ]);
      setResponses(resps);
      setResponseCategories(cats);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar respostas padrão';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAudience, selectedCategory, searchQuery]);

  // Initial and reactive load
  useEffect(() => {
    if (activeTab === 'commands') {
      loadCommands();
    } else {
      loadResponses();
    }
  }, [activeTab, loadCommands, loadResponses]);

  // One-click Copy Handler for Commands
  const handleCopyCommand = async (cmd: CommandItem) => {
    try {
      const fullCommand = cmd.steps?.map(s => s.command_text).join('\n') || '';
      await copyToClipboard(fullCommand);
      setCopiedId(`cmd-${cmd.id}`);
      success('Procedimento copiado!', 'O procedimento foi copiado para a área de transferência.');

      // Optimistic update
      setCommands((prev) =>
        prev.map((c) => (c.id === cmd.id ? { ...c, copies_count: c.copies_count + 1 } : c))
      );

      // Async backend record
      await commandService.copyCommand(cmd.id);
    } catch (err) {
      toastError('Erro ao copiar', 'Não foi possível copiar o procedimento para o clipboard.');
    } finally {
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleCopyStep = async (cmd: CommandItem, step: any) => {
    try {
      await copyToClipboard(step.command_text);
      setCopiedId(`cmd-${cmd.id}-step-${step.id}`);
      success('Passo copiado!', 'Comando copiado para a área de transferência.');
      setCommands((prev) => prev.map((c) => (c.id === cmd.id ? { ...c, copies_count: c.copies_count + 1 } : c)));
      await commandService.copyCommand(cmd.id);
    } catch (err) {
      toastError('Erro ao copiar', 'Não foi possível copiar o passo.');
    } finally {
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // One-click Copy Handler for Responses
  const handleCopyResponse = async (resp: StandardResponseItem) => {
    try {
      await copyToClipboard(resp.content);
      setCopiedId(`resp-${resp.id}`);
      success('Resposta copiada!', 'O texto padrão foi copiado para a área de transferência.');

      // Optimistic update
      setResponses((prev) =>
        prev.map((r) => (r.id === resp.id ? { ...r, copies_count: r.copies_count + 1 } : r))
      );

      // Async backend record
      await responseService.copyResponse(resp.id);
    } catch (err) {
      toastError('Erro ao copiar', 'Não foi possível copiar a resposta para o clipboard.');
    } finally {
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Open Create/Edit Command Modal
  // #commands?id=N (busca global): mostra o comando filtrando a lista pelo título
  useDeepLinkId('commands', async (id) => {
    try {
      const cmd = await commandService.getCommand(id);
      setActiveTab('commands');
      setSelectedSystem('all');
      setSelectedCategory('all');
      setSearchQuery(cmd.title);
    } finally {
      clearDeepLinkId();
    }
  });

  const handleOpenCommandDrawer = (cmd?: CommandItem) => {
    if (cmd) {
      setEditingCommand(cmd);
      setCommandForm({
        title: cmd.title,
        description: cmd.description || '',
        steps: cmd.steps && cmd.steps.length > 0 ? cmd.steps : [{ position: 1, title: 'Passo 1', command_text: '' }],
        system: cmd.system || 'Geral',
        category: cmd.category || '',
        tags: cmd.tags || '',
        notes: cmd.notes || '',
        warning: cmd.warning || '',
        visibility: cmd.visibility || 'equipe',
      });
    } else {
      setEditingCommand(null);
      setCommandForm({
        title: '',
        description: '',
        steps: [{ position: 1, title: 'Passo 1', command_text: '' }],
        system: selectedSystem !== 'all' ? selectedSystem : 'Geral',
        category: selectedCategory !== 'all' ? selectedCategory : '',
        tags: '',
        notes: '',
        warning: '',
        visibility: 'equipe',
      });
    }
    setIsCommandDrawerOpen(true);
  };

  // Save Command
  const handleSaveCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandForm.title.trim() || commandForm.steps.some(s => !s.command_text.trim())) {
      toastError('Campos obrigatórios', 'Por favor preencha o título e os códigos dos passos.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCommand) {
        await commandService.updateCommand(editingCommand.id, commandForm);
        success('Comando atualizado', 'As alterações foram salvas com sucesso.');
      } else {
        await commandService.createCommand(commandForm);
        success('Comando criado', 'Novo comando adicionado ao repositório operacional.');
      }
      setIsCommandDrawerOpen(false);
      loadCommands();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar comando';
      toastError('Erro ao salvar', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Command
  const confirm = useConfirm();

  const handleDeleteCommand = async (cmd: CommandItem) => {
    if (!(await confirm({ title: 'Excluir comando?', description: cmd.title }))) return;
    try {
      await commandService.deleteCommand(cmd.id);
      success('Comando excluído', 'O comando foi removido da biblioteca.');
      loadCommands();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao excluir comando';
      toastError('Erro ao excluir', msg);
    }
  };

  // Open Create/Edit Response Modal
  const handleOpenResponseDrawer = (resp?: StandardResponseItem) => {
    if (resp) {
      setEditingResponse(resp);
      setResponseForm({
        title: resp.title,
        content: resp.content,
        category: resp.category || '',
        audience: resp.audience || 'usuario_final',
        tags: resp.tags || '',
        visibility: resp.visibility || 'equipe',
      });
    } else {
      setEditingResponse(null);
      setResponseForm({
        title: '',
        content: '',
        category: selectedCategory !== 'all' ? selectedCategory : '',
        audience: selectedAudience !== 'all' ? selectedAudience : 'usuario_final',
        tags: '',
        visibility: 'equipe',
      });
    }
    setIsResponseDrawerOpen(true);
  };

  // Save Response
  const handleSaveResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseForm.title.trim() || !responseForm.content.trim()) {
      toastError('Campos obrigatórios', 'Por favor preencha o título e o conteúdo da resposta.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingResponse) {
        await responseService.updateResponse(editingResponse.id, responseForm);
        success('Resposta atualizada', 'As alterações foram salvas com sucesso.');
      } else {
        await responseService.createResponse(responseForm);
        success('Resposta criada', 'Nova resposta padrão adicionada à biblioteca.');
      }
      setIsResponseDrawerOpen(false);
      loadResponses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar resposta padrão';
      toastError('Erro ao salvar', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Response
  const handleDeleteResponse = async (resp: StandardResponseItem) => {
    if (!(await confirm({ title: 'Excluir resposta padrão?', description: resp.title }))) return;
    try {
      await responseService.deleteResponse(resp.id);
      success('Resposta excluída', 'A resposta foi removida da biblioteca.');
      loadResponses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao excluir resposta';
      toastError('Erro ao excluir', msg);
    }
  };

  // Permission helpers
  const canModifyCommand = (cmd: CommandItem) => {
    if (!user) return false;
    return hasRole('Administrador') || cmd.author_id === user.id;
  };

  const canModifyResponse = (resp: StandardResponseItem) => {
    if (!user) return false;
    return hasRole('Administrador') || resp.author_id === user.id;
  };

  // Distinct systems list with defaults
  const systemOptions = useMemo(() => {
    const defaults = ['Geral', 'Linux', 'Windows', 'Mikrotik', 'Redes', 'Docker', 'PostgreSQL', 'OTRS'];
    const merged = Array.from(new Set([...defaults, ...availableSystems]));
    return merged.sort();
  }, [availableSystems]);

  // Audience labels helper
  return (
    <div className="space-y-6">
      <PageHeader icon={Terminal} title="Comandos e Respostas" description="Comandos de terminal e respostas padrão para copiar com um clique.">
        {/* Action Button */}
        <div>
          {activeTab === 'commands' ? (
            <Button
              onClick={() => handleOpenCommandDrawer()}
              className="w-full sm:w-auto flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Comando</span>
            </Button>
          ) : (
            <Button
              onClick={() => handleOpenResponseDrawer()}
              className="w-full sm:w-auto flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Resposta</span>
            </Button>
          )}
        </div>
      </PageHeader>

      {/* 2. Primary Navigation Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val as ActiveTab);
          setSelectedCategory('all');
          setSearchQuery('');
        }}
        className="w-full"
      >
        <TabsList variant="underline" className="w-full justify-start border-b border-border/80 pb-0 mb-4">
          <TabsTrigger value="commands" className="gap-2.5 px-4 py-2 text-sm font-semibold h-11 data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none">
            <Terminal className="h-4 w-4" />
            <span>Comandos Rápidos</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-mono ml-1">
              {commands.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="responses" className="gap-2.5 px-4 py-2 text-sm font-semibold h-11 data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none">
            <MessageSquare className="h-4 w-4" />
            <span>Respostas Padrão</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-mono ml-1">
              {responses.length}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 3. Filter Bar (Search + Categorical Selectors) */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/60 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'commands'
                ? 'Buscar por comando, título, descrição ou tags...'
                : 'Buscar por título, conteúdo da mensagem ou tags...'
            }
            className="pl-10 h-10 bg-background/50 border-border/60"
          />
        </div>

        {/* Filter Pills based on active tab */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'commands' ? (
            <>
              {/* System selector */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Layers className="h-3.5 w-3.5" />
                <select
                  value={selectedSystem}
                  onChange={(e) => setSelectedSystem(e.target.value)}
                  className="rounded-lg border border-border/80 bg-background/80 px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="all">Todos os Sistemas</option>
                  {systemOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category selector */}
              {commandCategories.length > 0 && (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rounded-lg border border-border/80 bg-background/80 px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="all">Todas Categorias</option>
                  {commandCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </>
          ) : (
            <>
              {/* Audience selector */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <select
                  value={selectedAudience}
                  onChange={(e) => setSelectedAudience(e.target.value)}
                  className="rounded-lg border border-border/80 bg-background/80 px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="all">Todos os Destinatários</option>
                  <option value="usuario_final">Usuário Final</option>
                  <option value="tecnico">Equipe Técnica</option>
                  <option value="fornecedor">Fornecedores / Terceiros</option>
                </select>
              </div>

              {/* Response Category selector */}
              {responseCategories.length > 0 && (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rounded-lg border border-border/80 bg-background/80 px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="all">Todas Categorias</option>
                  {responseCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (activeTab === 'commands') loadCommands();
              else loadResponses();
            }}
            aria-label="Atualizar lista"
            className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 4. Main Content Area — 4 UI States */}

      {/* STATE 1: ERROR */}
      {errorMessage && (
        <Card className="border-red-500/30 bg-red-950/20">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-red-400" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-red-200">Falha ao carregar registros</h3>
              <p className="text-sm text-red-300/80">{errorMessage}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeTab === 'commands') loadCommands();
                else loadResponses();
              }}
              className="mt-2 border-red-500/30 hover:bg-red-500/10 text-red-300"
            >
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STATE 2: LOADING SKELETONS */}
      {isLoading && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border/60 bg-card/60">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-20 rounded-md" />
                    <Skeleton className="h-6 w-16 rounded-md" />
                  </div>
                  <Skeleton className="h-5 w-24 rounded-md" />
                </div>
                <Skeleton className="h-5 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* STATE 3: EMPTY STATE */}
      {!isLoading && !errorMessage && activeTab === 'commands' && commands.length === 0 && (
        <Card className="border-border/60 bg-card/40 border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Terminal className="h-8 w-8" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-lg font-semibold text-foreground font-heading">
                Nenhum comando operacional encontrado
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || selectedSystem !== 'all' || selectedCategory !== 'all'
                  ? 'Nenhum resultado corresponde aos filtros selecionados. Tente limpar os filtros de busca.'
                  : 'Comece a construir a biblioteca técnica registrando comandos frequentes de rede, servidores, diagnósticos e automação.'}
              </p>
            </div>
            <Button
              onClick={() => handleOpenCommandDrawer()}
              className="mt-2 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Adicionar Primeiro Comando</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !errorMessage && activeTab === 'responses' && responses.length === 0 && (
        <Card className="border-border/60 bg-card/40 border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <MessageSquare className="h-8 w-8" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-lg font-semibold text-foreground font-heading">
                Nenhuma resposta padrão encontrada
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || selectedAudience !== 'all' || selectedCategory !== 'all'
                  ? 'Nenhum modelo corresponde aos critérios de pesquisa informados.'
                  : 'Crie respostas padrão para orientações a usuários, comunicados de manutenção, encerramentos e acionamento de parceiros técnicos.'}
              </p>
            </div>
            <Button
              onClick={() => handleOpenResponseDrawer()}
              className="mt-2 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Adicionar Primeira Resposta</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STATE 4: IDEAL STATE — COMMANDS LIST */}
      {!isLoading && !errorMessage && activeTab === 'commands' && commands.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AnimatePresence>
            {commands.map((cmd) => {

              return (
                <motion.div
                  key={cmd.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <CommandCard cmd={cmd} copiedId={copiedId} canModify={canModifyCommand(cmd)} onCopy={() => handleCopyCommand(cmd)} onCopyStep={(step) => handleCopyStep(cmd, step)} onEdit={() => handleOpenCommandDrawer(cmd)} onDelete={() => handleDeleteCommand(cmd)} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* STATE 4: IDEAL STATE — RESPONSES LIST */}
      {!isLoading && !errorMessage && activeTab === 'responses' && responses.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AnimatePresence>
            {responses.map((resp) => {

              return (
                <motion.div
                  key={resp.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <ResponseCard resp={resp} copiedId={copiedId} canModify={canModifyResponse(resp)} onCopy={() => handleCopyResponse(resp)} onEdit={() => handleOpenResponseDrawer(resp)} onDelete={() => handleDeleteResponse(resp)} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* 5. MODAL: CREATE / EDIT COMMAND */}
      <CommandFormDrawer
        open={isCommandDrawerOpen}
        onOpenChange={setIsCommandDrawerOpen}
        isEditing={Boolean(editingCommand)}
        form={commandForm}
        setForm={setCommandForm}
        isSubmitting={isSubmitting}
        onSubmit={handleSaveCommand}
      />

      {/* 6. MODAL: CREATE / EDIT STANDARD RESPONSE */}
      <ResponseFormDrawer
        open={isResponseDrawerOpen}
        onOpenChange={setIsResponseDrawerOpen}
        isEditing={Boolean(editingResponse)}
        form={responseForm}
        setForm={setResponseForm}
        isSubmitting={isSubmitting}
        onSubmit={handleSaveResponse}
      />
    </div>
  );
};
