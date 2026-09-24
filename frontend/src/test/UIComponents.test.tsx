import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Button,
  Input,
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
  });

  describe('Input', () => {
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
  });

  describe('Card', () => {
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
  });

  describe('Badge', () => {
    it('renders badges with different variants', () => {
      render(
        <div>
          <Badge variant="default">Admin</Badge>
          <Badge variant="success">Ativo</Badge>
          <Badge variant="warning">Pendente</Badge>
        </div>
      );

      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Ativo')).toBeInTheDocument();
      expect(screen.getByText('Pendente')).toBeInTheDocument();
    });
  });

  describe('Dialog', () => {
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

      // Dialog starts closed
      expect(screen.queryByText('Título do Modal')).not.toBeInTheDocument();

      // Click trigger
      fireEvent.click(screen.getByRole('button', { name: /abrir modal/i }));

      // Dialog is now open
      expect(screen.getByText('Título do Modal')).toBeInTheDocument();
      expect(screen.getByText('Descrição do Modal')).toBeInTheDocument();
    });
  });
});
