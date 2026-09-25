import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Button,
  Input,
  Textarea,
  Select,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
  ErrorState,
} from '@/components/ui';

describe('UI Base Components (shadcn/ui)', () => {
  describe('Button', () => {
    it('renders with default props and handles click events', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Clique Aqui</Button>);

      const btn = screen.getByRole('button', { name: /clique aqui/i });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders destructive variant and disabled state', () => {
      render(<Button variant="destructive" disabled>Excluir</Button>);

      const btn = screen.getByRole('button', { name: /excluir/i });
      expect(btn).toBeDisabled();
      expect(btn.className).toContain('bg-destructive');
    });

    it('supports loading state with disabled interaction', () => {
      render(<Button loading>Salvando</Button>);
      const btn = screen.getByRole('button', { name: /salvando/i });
      expect(btn).toBeDisabled();
    });
  });

  describe('Input & Form Controls', () => {
    it('renders and accepts text input', () => {
      render(<Input placeholder="Digite seu nome" defaultValue="Suporte" />);

      const input = screen.getByPlaceholderText(/digite seu nome/i) as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.value).toBe('Suporte');

      fireEvent.change(input, { target: { value: 'Novo Valor' } });
      expect(input.value).toBe('Novo Valor');
    });

    it('supports disabled state', () => {
      render(<Input disabled placeholder="Desativado" />);
      const input = screen.getByPlaceholderText(/desativado/i);
      expect(input).toBeDisabled();
    });

    it('renders Textarea with content and error state', () => {
      render(<Textarea placeholder="Observações técnicas" error defaultValue="Texto inicial" />);
      const textarea = screen.getByPlaceholderText(/observações técnicas/i) as HTMLTextAreaElement;
      expect(textarea).toBeInTheDocument();
      expect(textarea.value).toBe('Texto inicial');
      expect(textarea.className).toContain('border-destructive');
    });

    it('renders Select and Label with required asterisk', () => {
      render(
        <div>
          <Label htmlFor="category-select" required>Categoria</Label>
          <Select id="category-select" defaultValue="rede">
            <option value="hardware">Hardware</option>
            <option value="rede">Rede</option>
          </Select>
        </div>
      );
      expect(screen.getByText('Categoria')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('Card & Surface Nesting', () => {
    it('renders complete card structure with header, title, and content', () => {
      render(
        <Card data-testid="test-card">
          <CardHeader>
            <CardTitle>Título do Card</CardTitle>
            <CardDescription>Descrição do Card</CardDescription>
          </CardHeader>
          <CardContent>Conteúdo Interno</CardContent>
          <CardFooter>Rodapé do Card</CardFooter>
        </Card>
      );

      expect(screen.getByTestId('test-card')).toBeInTheDocument();
      expect(screen.getByText('Título do Card')).toBeInTheDocument();
      expect(screen.getByText('Descrição do Card')).toBeInTheDocument();
      expect(screen.getByText('Conteúdo Interno')).toBeInTheDocument();
      expect(screen.getByText('Rodapé do Card')).toBeInTheDocument();
    });

    it('supports flat variant to resolve box-inside-box nesting', () => {
      render(<Card variant="flat" data-testid="flat-card">Seção Interna</Card>);
      const card = screen.getByTestId('flat-card');
      expect(card.className).toContain('border-0');
      expect(card.className).toContain('bg-muted/20');
    });
  });

  describe('Badge', () => {
    it('renders badges with different variants', () => {
      render(
        <div>
          <Badge variant="default">Admin</Badge>
          <Badge variant="success">Ativo</Badge>
          <Badge variant="warning">Pendente</Badge>
          <Badge variant="info">Informativo</Badge>
        </div>
      );

      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Ativo')).toBeInTheDocument();
      expect(screen.getByText('Pendente')).toBeInTheDocument();
      expect(screen.getByText('Informativo')).toBeInTheDocument();
    });
  });

  describe('Dialog & Drawer', () => {
    it('opens and displays dialog modal content when triggered', () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Abrir Modal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Título do Modal</DialogTitle>
            <DialogDescription>Descrição do Modal</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      expect(screen.queryByText('Título do Modal')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /abrir modal/i }));

      expect(screen.getByText('Título do Modal')).toBeInTheDocument();
      expect(screen.getByText('Descrição do Modal')).toBeInTheDocument();
    });

    it('opens and renders lateral Drawer for progressive disclosure', () => {
      render(
        <Drawer>
          <DrawerTrigger asChild>
            <Button>Abrir Gaveta</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerTitle>Painel Lateral</DrawerTitle>
            <div>Detalhes expandidos</div>
          </DrawerContent>
        </Drawer>
      );

      expect(screen.queryByText('Painel Lateral')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /abrir gaveta/i }));

      expect(screen.getByText('Painel Lateral')).toBeInTheDocument();
      expect(screen.getByText('Detalhes expandidos')).toBeInTheDocument();
    });
  });

  describe('Tabs', () => {
    it('switches tab content when trigger is clicked', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Aba 1</TabsTrigger>
            <TabsTrigger value="tab2">Aba 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Conteúdo Aba 1</TabsContent>
          <TabsContent value="tab2">Conteúdo Aba 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByText('Conteúdo Aba 1')).toBeInTheDocument();
      expect(screen.queryByText('Conteúdo Aba 2')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('tab', { name: /aba 2/i }));
      expect(screen.getByText('Conteúdo Aba 2')).toBeInTheDocument();
      expect(screen.queryByText('Conteúdo Aba 1')).not.toBeInTheDocument();
    });
  });

  describe('Table', () => {
    it('renders semantic table structure and cells', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipamento</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Servidor Dell R640</TableCell>
              <TableCell>Operacional</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByText('Equipamento')).toBeInTheDocument();
      expect(screen.getByText('Servidor Dell R640')).toBeInTheDocument();
      expect(screen.getByText('Operacional')).toBeInTheDocument();
    });
  });

  describe('Empty & Error States', () => {
    it('renders EmptyState with action trigger', () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          title="Nenhum registro encontrado"
          description="Cadastre um novo item para começar."
          actionLabel="Novo Registro"
          onAction={handleAction}
        />
      );

      expect(screen.getByText('Nenhum registro encontrado')).toBeInTheDocument();
      expect(screen.getByText('Cadastre um novo item para começar.')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /novo registro/i }));
      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('renders ErrorState with retry trigger', () => {
      const handleRetry = vi.fn();
      render(
        <ErrorState
          title="Falha na sincronização"
          message="Servidor indisponível"
          onRetry={handleRetry}
        />
      );

      expect(screen.getByText('Falha na sincronização')).toBeInTheDocument();
      expect(screen.getByText('Servidor indisponível')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });
});
