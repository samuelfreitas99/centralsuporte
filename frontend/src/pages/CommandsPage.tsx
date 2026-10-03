import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useConfirm } from '@/hooks/useConfirm';
import { motion, AnimatePresence } from 'motion/react';
import {
  Terminal,
  MessageSquare,
  Search,
  Plus,
  Copy,
  Check,
  AlertTriangle,
  Layers,
  Users,
  Edit2,
  Trash2,
  Lock,
  RefreshCw,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useDeepLinkId, clearDeepLinkId } from '@/hooks/useDeepLink';
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
  const getAudienceLabel = (audience: string) => {
    switch (audience) {
      case 'usuario_final':
        return { label: 'Usuário Final', variant: 'success' as const };
      case 'tecnico':
        return { label: 'Equipe Técnica', variant: 'default' as const };
      case 'fornecedor':
        return { label: 'Fornecedor', variant: 'info' as const };
      default:
        return { label: audience, variant: 'secondary' as const };
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header and Module Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
              Comandos e Respostas
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Biblioteca de comandos úteis de suporte e modelos de comunicação padrão com cópia rápida em 1 clique.
          </p>
        </div>

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
      </div>

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
              const isCopied = copiedId === `cmd-${cmd.id}`;
              const hasWarning = Boolean(cmd.warning && cmd.warning.trim().length > 0);

              return (
                <motion.div
                  key={cmd.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="h-full flex flex-col justify-between border-border/80 bg-card/75 hover:border-blue-500/40 hover:shadow-lg transition-all duration-200">
                    <CardContent className="p-5 space-y-3.5">
                      {/* Top Badges Row */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="default" className="text-[11px] font-mono">
                            {cmd.system || 'Geral'}
                          </Badge>
                          {cmd.category && (
                            <Badge variant="secondary" className="text-[11px]">
                              {cmd.category}
                            </Badge>
                          )}
                          {cmd.visibility === 'privado' && (
                            <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              <span>Privado</span>
                            </Badge>
                          )}
                        </div>

                        {/* Copy counter */}
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                          <Copy className="h-3 w-3 text-blue-400" />
                          <span>{cmd.copies_count} cópias</span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-base font-bold text-foreground tracking-tight leading-snug">
                          {cmd.title}
                        </h3>
                        {cmd.description && (
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                            {cmd.description}
                          </p>
                        )}
                      </div>

                      {/* Destructive / Operational Warning Callout */}
                      {hasWarning && (
                        <div className="flex flex-col gap-1.5 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs">
                          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-destructive">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>Risco Operacional: Comando Destrutivo</span>
                          </div>
                          <div className="font-medium leading-relaxed opacity-90 text-foreground">
                            {cmd.warning}
                          </div>
                        </div>
                      )}

                      {/* Steps Code blocks */}
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                        {cmd.steps?.map((step) => {
                          const stepCopiedId = `cmd-${cmd.id}-step-${step.id}`;
                          const isStepCopied = copiedId === stepCopiedId;
                          return (
                            <div key={step.id} className="relative group rounded-xl border border-border/80 bg-slate-950/80 p-3 overflow-hidden shadow-inner">
                              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pb-1.5 mb-1.5 border-b border-white/[0.05]">
                                <span className="flex items-center gap-1.5 text-slate-400 font-semibold">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
                                  <span>Passo {step.position}: {step.title}</span>
                                </span>
                              </div>
                              {step.description && (
                                <p className="text-[11px] text-slate-400 mb-2">{step.description}</p>
                              )}
                              <div className="font-mono text-xs sm:text-sm text-blue-300 whitespace-pre-wrap break-all py-1 selection:bg-blue-600/40">
                                {step.command_text}
                              </div>
                              <div className="mt-3 flex items-center justify-end">
                                <Button
                                  size="sm"
                                  variant={isStepCopied ? 'secondary' : 'default'}
                                  onClick={() => handleCopyStep(cmd, step)}
                                  className="h-7 px-2 text-[10px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                                >
                                  {isStepCopied ? (
                                    <>
                                      <Check className="h-3 w-3" />
                                      <span>Copiado!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3" />
                                      <span>Copiar Passo</span>
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Copy All Action */}
                      <div className="mt-3 flex items-center justify-between">
                          {hasWarning ? (
                            <span className="text-[10px] text-muted-foreground italic max-w-[60%]">
                              Copiar não executa o comando. Use com cautela.
                            </span>
                          ) : (
                            <span />
                          )}
                          <Button
                            size="sm"
                            variant={isCopied ? 'secondary' : 'default'}
                            onClick={() => handleCopyCommand(cmd)}
                            className="h-8 px-3 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm w-full sm:w-auto"
                          >
                            {isCopied ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                <span>Procedimento Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copiar Todos</span>
                              </>
                            )}
                          </Button>
                      </div>

                      {/* Technical Notes / Guidelines */}
                      {cmd.notes && (
                        <div className="text-[11px] text-muted-foreground bg-muted/20 rounded-lg p-2.5 border border-border/40">
                          <span className="font-semibold text-foreground mr-1">Observações:</span>
                          {cmd.notes}
                        </div>
                      )}

                      {/* Footer: Tags and Edit/Delete controls */}
                      <div className="pt-2 flex items-center justify-between border-t border-border/60 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {cmd.tags &&
                            cmd.tags.split(',').map((t, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground"
                              >
                                #{t.trim()}
                              </span>
                            ))}
                        </div>

                        {canModifyCommand(cmd) && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenCommandDrawer(cmd)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                              aria-label="Editar comando"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCommand(cmd)}
                              className="h-7 w-7 text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
                              aria-label="Excluir comando"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
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
              const isCopied = copiedId === `resp-${resp.id}`;
              const audienceInfo = getAudienceLabel(resp.audience);

              return (
                <motion.div
                  key={resp.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="h-full flex flex-col justify-between border-border/80 bg-card/75 hover:border-blue-500/40 hover:shadow-lg transition-all duration-200">
                    <CardContent className="p-5 space-y-3.5">
                      {/* Top Badges Row */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant={audienceInfo.variant} className="text-[11px]">
                            {audienceInfo.label}
                          </Badge>
                          {resp.category && (
                            <Badge variant="secondary" className="text-[11px]">
                              {resp.category}
                            </Badge>
                          )}
                          {resp.visibility === 'privado' && (
                            <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              <span>Privado</span>
                            </Badge>
                          )}
                        </div>

                        {/* Copy counter */}
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                          <Copy className="h-3 w-3 text-blue-400" />
                          <span>{resp.copies_count} cópias</span>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-foreground tracking-tight leading-snug">
                        {resp.title}
                      </h3>

                      {/* Content Preview Box */}
                      <div className="relative rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-2">
                        <div className="text-xs sm:text-sm text-foreground/90 whitespace-pre-line leading-relaxed font-sans max-h-48 overflow-y-auto selection:bg-blue-600/30 pr-1">
                          {resp.content}
                        </div>

                        {/* Copy Action */}
                        <div className="pt-2 flex items-center justify-end border-t border-border/40">
                          <Button
                            size="sm"
                            variant={isCopied ? 'secondary' : 'default'}
                            onClick={() => handleCopyResponse(resp)}
                            className="h-8 px-3 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          >
                            {isCopied ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                <span>Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copiar Resposta</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Footer: Tags and Actions */}
                      <div className="pt-2 flex items-center justify-between border-t border-border/60 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {resp.tags &&
                            resp.tags.split(',').map((t, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground"
                              >
                                #{t.trim()}
                              </span>
                            ))}
                        </div>

                        {canModifyResponse(resp) && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenResponseDrawer(resp)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                              aria-label="Editar resposta"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteResponse(resp)}
                              className="h-7 w-7 text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
                              aria-label="Excluir resposta"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* 5. MODAL: CREATE / EDIT COMMAND */}
      <Drawer open={isCommandDrawerOpen} onOpenChange={setIsCommandDrawerOpen}>
        <DrawerContent size="lg" side="right">
          <form onSubmit={handleSaveCommand} className="space-y-4 overflow-y-auto max-h-[85vh] px-4 pb-8 custom-scrollbar">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2 font-heading">
                <Terminal className="h-5 w-5 text-blue-400" />
                <span>{editingCommand ? 'Editar Comando Operacional' : 'Novo Comando Operacional'}</span>
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
                  value={commandForm.title}
                  onChange={(e) => setCommandForm({ ...commandForm, title: e.target.value })}
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
                      const newSteps = [...commandForm.steps, { position: commandForm.steps.length + 1, title: `Passo ${commandForm.steps.length + 1}`, command_text: '' }];
                      setCommandForm({ ...commandForm, steps: newSteps });
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Passo
                  </Button>
                </div>
                
                {commandForm.steps.map((step, index) => (
                  <div key={index} className="rounded-xl border border-border/60 bg-muted/10 p-3 space-y-3 relative">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <Input
                          value={step.title}
                          onChange={(e) => {
                            const newSteps = [...commandForm.steps];
                            newSteps[index].title = e.target.value;
                            setCommandForm({ ...commandForm, steps: newSteps });
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
                            const newSteps = [...commandForm.steps];
                            [newSteps[index], newSteps[index - 1]] = [newSteps[index - 1], newSteps[index]];
                            newSteps.forEach((s, i) => s.position = i + 1);
                            setCommandForm({ ...commandForm, steps: newSteps });
                          }}
                          className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-foreground"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === commandForm.steps.length - 1}
                          onClick={() => {
                            const newSteps = [...commandForm.steps];
                            [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
                            newSteps.forEach((s, i) => s.position = i + 1);
                            setCommandForm({ ...commandForm, steps: newSteps });
                          }}
                          className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-foreground"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={commandForm.steps.length === 1}
                          onClick={() => {
                            const newSteps = commandForm.steps.filter((_, i) => i !== index);
                            newSteps.forEach((s, i) => s.position = i + 1);
                            setCommandForm({ ...commandForm, steps: newSteps });
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
                        const newSteps = [...commandForm.steps];
                        newSteps[index].description = e.target.value;
                        setCommandForm({ ...commandForm, steps: newSteps });
                      }}
                      rows={1}
                      placeholder="Descrição opcional..."
                      className="w-full rounded-lg border border-border/80 bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />

                    <textarea
                      value={step.command_text}
                      onChange={(e) => {
                        const newSteps = [...commandForm.steps];
                        newSteps[index].command_text = e.target.value;
                        setCommandForm({ ...commandForm, steps: newSteps });
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
                    value={commandForm.system || ''}
                    onChange={(e) => setCommandForm({ ...commandForm, system: e.target.value })}
                    placeholder="Linux, Windows, Mikrotik, Docker..."
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    Categoria Operacional
                  </label>
                  <Input
                    value={commandForm.category || ''}
                    onChange={(e) => setCommandForm({ ...commandForm, category: e.target.value })}
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
                  value={commandForm.warning || ''}
                  onChange={(e) => setCommandForm({ ...commandForm, warning: e.target.value })}
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
                  value={commandForm.notes || ''}
                  onChange={(e) => setCommandForm({ ...commandForm, notes: e.target.value })}
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
                    value={commandForm.tags || ''}
                    onChange={(e) => setCommandForm({ ...commandForm, tags: e.target.value })}
                    placeholder="dns, cache, rede, windows"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    Visibilidade
                  </label>
                  <select
                    value={commandForm.visibility || 'equipe'}
                    onChange={(e) => setCommandForm({ ...commandForm, visibility: e.target.value })}
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
                onClick={() => setIsCommandDrawerOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
                {isSubmitting ? 'Salvando...' : editingCommand ? 'Salvar Alterações' : 'Cadastrar Comando'}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      {/* 6. MODAL: CREATE / EDIT STANDARD RESPONSE */}
      <Drawer open={isResponseDrawerOpen} onOpenChange={setIsResponseDrawerOpen}>
        <DrawerContent size="lg" side="right">
          <form onSubmit={handleSaveResponse} className="space-y-4 overflow-y-auto max-h-[85vh] px-4 pb-8 custom-scrollbar">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2 font-heading">
                <MessageSquare className="h-5 w-5 text-blue-400" />
                <span>{editingResponse ? 'Editar Resposta Padrão' : 'Nova Resposta Padrão'}</span>
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
                  value={responseForm.title}
                  onChange={(e) => setResponseForm({ ...responseForm, title: e.target.value })}
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
                  value={responseForm.content}
                  onChange={(e) => setResponseForm({ ...responseForm, content: e.target.value })}
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
                    value={responseForm.audience || 'usuario_final'}
                    onChange={(e) => setResponseForm({ ...responseForm, audience: e.target.value })}
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
                    value={responseForm.category || ''}
                    onChange={(e) => setResponseForm({ ...responseForm, category: e.target.value })}
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
                    value={responseForm.tags || ''}
                    onChange={(e) => setResponseForm({ ...responseForm, tags: e.target.value })}
                    placeholder="atendimento, reinicio, orientacao"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    Visibilidade
                  </label>
                  <select
                    value={responseForm.visibility || 'equipe'}
                    onChange={(e) => setResponseForm({ ...responseForm, visibility: e.target.value })}
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
                onClick={() => setIsResponseDrawerOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
                {isSubmitting ? 'Salvando...' : editingResponse ? 'Salvar Alterações' : 'Cadastrar Resposta'}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  );
};
