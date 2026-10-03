import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDeepLinkId, readDeepLinkId, clearDeepLinkId } from '@/hooks/useDeepLink';

describe('useDeepLink', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '#dashboard');
  });

  it('reads the id only for the matching module', () => {
    window.history.replaceState(null, '', '#tasks?id=42&page=2');
    expect(readDeepLinkId('tasks')).toBe(42);
    expect(readDeepLinkId('attendance')).toBeNull();
  });

  it('calls onOpen on mount and when navigation targets the module', () => {
    const onOpen = vi.fn();
    window.history.replaceState(null, '', '#tasks?id=7');
    renderHook(() => useDeepLinkId('tasks', onOpen));
    expect(onOpen).toHaveBeenCalledWith(7);

    act(() => {
      window.history.pushState(null, '', '#tasks?id=9');
      window.dispatchEvent(new Event('popstate'));
    });
    expect(onOpen).toHaveBeenLastCalledWith(9);

    act(() => {
      window.history.pushState(null, '', '#knowledge?id=3');
      window.dispatchEvent(new Event('popstate'));
    });
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it('clears only the id, keeping other params', () => {
    window.history.replaceState(null, '', '#tasks?id=5&status=pendente');
    clearDeepLinkId();
    expect(window.location.hash).toBe('#tasks?status=pendente');
  });
});
