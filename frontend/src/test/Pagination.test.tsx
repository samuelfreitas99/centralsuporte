import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Pagination } from '../components/ui/Pagination';

describe('Pagination Component', () => {
  it('renders nothing if totalPages is 1', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders correctly with multiple pages', () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole('navigation', { name: 'Paginação' })).toBeInTheDocument();
    
    // Previous button should be disabled on first page
    const prevButtons = screen.getAllByRole('button', { name: 'Página anterior' });
    expect(prevButtons[0]).toBeDisabled();
    expect(prevButtons[1]).toBeDisabled(); // desktop and mobile
    
    // Next button should be enabled
    const nextButtons = screen.getAllByRole('button', { name: 'Próxima página' });
    expect(nextButtons[0]).not.toBeDisabled();
    expect(nextButtons[1]).not.toBeDisabled();
  });

  it('disables next button on the last page', () => {
    render(<Pagination currentPage={5} totalPages={5} onPageChange={vi.fn()} />);
    
    const nextButtons = screen.getAllByRole('button', { name: 'Próxima página' });
    expect(nextButtons[0]).toBeDisabled();
    expect(nextButtons[1]).toBeDisabled();
    
    const prevButtons = screen.getAllByRole('button', { name: 'Página anterior' });
    expect(prevButtons[0]).not.toBeDisabled();
  });

  it('calls onPageChange when clicking next', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />);
    
    const nextButtons = screen.getAllByRole('button', { name: 'Próxima página' });
    fireEvent.click(nextButtons[1]); // desktop button
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange when clicking a specific page number', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />);
    
    const page3 = screen.getByRole('button', { name: 'Ir para a página 3' });
    fireEvent.click(page3);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('renders ellipsis for large ranges', () => {
    render(<Pagination currentPage={5} totalPages={10} onPageChange={vi.fn()} />);
    
    // Should show 1, ..., 4, 5, 6, ..., 10
    expect(screen.getByRole('button', { name: 'Ir para a página 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir para a página 4' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir para a página 6' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir para a página 10' })).toBeInTheDocument();
    
    // Ellipsis are not buttons, they are spans inside list items, we can check for MoreHorizontal icon (or by class/role)
    const ellipses = screen.getAllByRole('listitem').filter(li => li.innerHTML.includes('lucide-more-horizontal'));
    expect(ellipses.length).toBe(2);
  });
});
