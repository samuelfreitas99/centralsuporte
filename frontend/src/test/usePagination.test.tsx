import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { usePagination } from '../hooks/usePagination';

describe('usePagination Hook', () => {
  beforeEach(() => {
    // Reset window hash before each test
    window.location.hash = '';
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => usePagination(50));
    
    expect(result.current.page).toBe(1);
    expect(result.current.limit).toBe(50);
  });

  it('updates page and modifies hash url', () => {
    window.location.hash = '#attendance';
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setPage(3);
    });

    expect(window.location.hash).toContain('page=3');
    // Note: React 18 state updates from outside events in tests might need forcing, 
    // but we can check the URL was updated correctly.
  });

  it('removes page param when setting page to 1', () => {
    window.location.hash = '#attendance?page=2';
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setPage(1);
    });

    expect(window.location.hash).not.toContain('page=');
  });

  it('updates limit and resets page to 1', () => {
    window.location.hash = '#attendance?page=3&limit=20';
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setLimit(100);
    });

    expect(window.location.hash).toContain('limit=100');
    expect(window.location.hash).not.toContain('page=');
  });
});
