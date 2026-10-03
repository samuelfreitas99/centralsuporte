import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FilterBar, FilterSelect } from '@/components/ui/FilterBar';

describe('FilterBar', () => {
  afterEach(() => vi.useRealTimers());

  it('calls onSearch only after the user stops typing', () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    render(<FilterBar search="" onSearch={onSearch} placeholder="Buscar..." />);
    const input = screen.getByLabelText('Buscar');

    fireEvent.change(input, { target: { value: 'p' } });
    fireEvent.change(input, { target: { value: 'pdv' } });
    act(() => vi.advanceTimersByTime(200));
    expect(onSearch).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(200));
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('pdv');
  });

  it('follows external changes to the search value', () => {
    const { rerender } = render(<FilterBar search="a" onSearch={vi.fn()} placeholder="Buscar..." />);
    rerender(<FilterBar search="switch core" onSearch={vi.fn()} placeholder="Buscar..." />);
    expect(screen.getByLabelText('Buscar')).toHaveValue('switch core');
  });

  it('FilterSelect offers an "all" option and reports changes', () => {
    const onChange = vi.fn();
    render(<FilterSelect label="Status" value="all" onChange={onChange} options={[{ value: 'resolvido', label: 'Resolvido' }]} />);
    expect(screen.getByRole('option', { name: 'Status: todos' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'resolvido' } });
    expect(onChange).toHaveBeenCalledWith('resolvido');
  });
});
