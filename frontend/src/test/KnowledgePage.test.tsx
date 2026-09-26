import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KnowledgePage } from '@/pages/KnowledgePage';
import { knowledgeService } from '@/services/knowledgeService';
import type { KnowledgeArticle, KnowledgeCategory } from '@/types/knowledge';

vi.mock('@/services/knowledgeService', () => ({
  knowledgeService: {
    getCategories: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    getArticles: vi.fn(),
    getArticleById: vi.fn(),
    createArticle: vi.fn(),
    updateArticle: vi.fn(),
    deleteArticle: vi.fn(),
    toggleFavorite: vi.fn(),
    restoreArticleVersion: vi.fn(),
  },
}));

const mockCategories: KnowledgeCategory[] = [
  { id: 1, name: 'Redes', description: 'Switches e Roteamento', color: '#0284c7', articles_count: 1, created_at: new Date().toISOString() },
  { id: 2, name: 'Servidores', description: 'Linux e Windows', color: '#e11d48', articles_count: 0, created_at: new Date().toISOString() },
];

const mockArticles: KnowledgeArticle[] = [
  {
    id: 1,
    title: 'Procedimento de Backup e Restauração de Switch HP',
    summary: 'Backup de flash e configuração via TFTP/SCP',
    content: 'Guia completo de extração do arquivo config.cfg e imagem binária.',
    problem: 'Necessidade de substituir switch com defeito sem perder configurações.',
    solution: 'Restaurar backup via TFTP no switch substituto.',
    commands: 'copy running-config tftp 10.0.0.5 config.cfg',
    category_id: 1,
    category: mockCategories[0],
    author_id: 1,
    author: { id: 1, username: 'admin', email: 'admin@local', is_active: true },
    status: 'publicado',
    visibility: 'equipe',
    views_count: 14,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: [
      { id: 1, name: 'backup', created_at: new Date().toISOString() },
      { id: 2, name: 'switch', created_at: new Date().toISOString() },
    ],
    versions: [
      {
        id: 2,
        article_id: 1,
        version_number: 2,
        title: 'Procedimento de Backup e Restauração de Switch HP',
        content: 'Guia revisado de backup',
        change_summary: 'Revisão com SCP',
        editor_id: 1,
        created_at: new Date().toISOString(),
      },
      {
        id: 1,
        article_id: 1,
        version_number: 1,
        title: 'Procedimento de Backup e Restauração de Switch HP',
        content: 'Guia inicial de backup',
        change_summary: 'Versão inicial',
        editor_id: 1,
        created_at: new Date().toISOString(),
      },
    ],
    is_favorite: false,
  },
];

describe('KnowledgePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(knowledgeService.getCategories).mockResolvedValue(mockCategories);
    vi.mocked(knowledgeService.getArticles).mockResolvedValue(mockArticles);
    vi.mocked(knowledgeService.getArticleById).mockResolvedValue(mockArticles[0]);
    vi.mocked(knowledgeService.createCategory).mockResolvedValue({
      id: 3,
      name: 'pfSense',
      description: 'Firewall',
      color: '#10b981',
      articles_count: 0,
      created_at: new Date().toISOString(),
    });
    vi.mocked(knowledgeService.updateCategory).mockResolvedValue({
      id: 1,
      name: 'Redes Avançadas',
      description: 'Switches e Roteamento',
      color: '#0284c7',
      articles_count: 1,
      created_at: new Date().toISOString(),
    });
    vi.mocked(knowledgeService.deleteCategory).mockResolvedValue({
      message: 'Categoria removida com sucesso',
      articles_affected: 1,
    });
    vi.mocked(knowledgeService.toggleFavorite).mockResolvedValue({
      status: 'ok',
      action: 'added',
      is_favorite: true,
    });
    window.location.hash = '';
  });

  it('renders header, categories, and articles list', async () => {
    render(<KnowledgePage />);

    expect(screen.getByText('Base de Conhecimento Técnico')).toBeInTheDocument();
    expect(screen.getByText('Novo Artigo Técnico')).toBeInTheDocument();
    expect(screen.getByText('Gerenciar Categorias')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Procedimento de Backup e Restauração de Switch HP')).toBeInTheDocument();
    });

    expect(screen.getByText('#backup')).toBeInTheDocument();
    expect(screen.getByText('#switch')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
  });

  it('opens and closes new article dialog', async () => {
    render(<KnowledgePage />);

    await waitFor(() => {
      expect(screen.getByText('Novo Artigo Técnico')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Novo Artigo Técnico'));

    expect(screen.getByPlaceholderText('Ex: Resolução de Queda de Link e Roteamento de Backup')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancelar'));
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Ex: Resolução de Queda de Link e Roteamento de Backup')).not.toBeInTheDocument();
    });
  });

  it('opens article detail dialog with structured sections and versions tab', async () => {
    render(<KnowledgePage />);

    await waitFor(() => {
      expect(screen.getByText('Procedimento de Backup e Restauração de Switch HP')).toBeInTheDocument();
    });

    // Click on article card
    fireEvent.click(screen.getByText('Procedimento de Backup e Restauração de Switch HP'));

    await waitFor(() => {
      expect(screen.getByText('Sintomas / Problema Observado')).toBeInTheDocument();
      expect(screen.getByText('Solução / Diagnóstico')).toBeInTheDocument();
      expect(screen.getByText('Comandos Técnicos Relacionados')).toBeInTheDocument();
      expect(screen.getByText('copy running-config tftp 10.0.0.5 config.cfg')).toBeInTheDocument();
      expect(screen.getByText('Copiar Comandos')).toBeInTheDocument();
    });

    // Switch to versions tab
    fireEvent.click(screen.getByText(/Histórico de Versões/i));
    await waitFor(() => {
      expect(screen.getAllByText(/Versão v2/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Versão v1/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Versão inicial')).toBeInTheDocument();
      expect(screen.getByText('Revisão com SCP')).toBeInTheDocument();
    });

    // Restore v1
    window.confirm = vi.fn(() => true);
    const restoreBtn = screen.getByTitle('Restaurar esta versão histórica');
    fireEvent.click(restoreBtn);

    await waitFor(() => {
      expect(knowledgeService.restoreArticleVersion).toHaveBeenCalledWith(1, 1);
    });
  });

  it('opens category management dialog, creates and manages categories', async () => {
    window.confirm = vi.fn(() => true);
    render(<KnowledgePage />);

    await waitFor(() => {
      expect(screen.getByText('Gerenciar Categorias')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Gerenciar Categorias'));

    await waitFor(() => {
      expect(screen.getByText('Gerenciar Categorias da Base de Conhecimento')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Ex: Servidores Linux, Redes, pfSense')).toBeInTheDocument();
      expect(screen.getByText('Categorias Cadastradas (2)')).toBeInTheDocument();
    });

    // Add new category
    fireEvent.change(screen.getByPlaceholderText('Ex: Servidores Linux, Redes, pfSense'), {
      target: { value: 'pfSense' },
    });
    fireEvent.change(screen.getByPlaceholderText('Ex: Procedimentos de infraestrutura e roteamento'), {
      target: { value: 'Firewall e roteamento' },
    });

    fireEvent.click(screen.getByText('Adicionar Categoria'));

    await waitFor(() => {
      expect(knowledgeService.createCategory).toHaveBeenCalledWith({
        name: 'pfSense',
        description: 'Firewall e roteamento',
        color: expect.any(String),
      });
    });
  });

  it('toggles favorite on article card', async () => {
    render(<KnowledgePage />);

    await waitFor(() => {
      expect(screen.getByText('Procedimento de Backup e Restauração de Switch HP')).toBeInTheDocument();
    });

    const favButton = screen.getByTitle('Favoritar artigo');
    fireEvent.click(favButton);

    await waitFor(() => {
      expect(knowledgeService.toggleFavorite).toHaveBeenCalledWith(1);
    });
  });

  it('filters by category when clicking a category pill', async () => {
    render(<KnowledgePage />);

    await waitFor(() => {
      expect(screen.getByText('Procedimento de Backup e Restauração de Switch HP')).toBeInTheDocument();
    });

    // Click on category pill for 'Redes'
    const pill = screen.getByRole('button', { name: /Redes/i });
    fireEvent.click(pill);

    await waitFor(() => {
      expect(knowledgeService.getArticles).toHaveBeenCalledWith(
        expect.objectContaining({ category_id: 1 })
      );
    });
  });
});
