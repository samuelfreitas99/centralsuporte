import '@testing-library/jest-dom/vitest';

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Polyfill ResizeObserver for jsdom
(window as unknown as Record<string, unknown>).ResizeObserver = MockResizeObserver;
(globalThis as unknown as Record<string, unknown>).ResizeObserver = MockResizeObserver;
import { vi } from 'vitest';

vi.mock('@/hooks/useAuth', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('@/hooks/useAuth');
  return {
    ...actual,
    useAuth: () => {
      try {
        return actual.useAuth();
      } catch (e) {
        return {
          user: { id: 1, username: 'admin', display_name: 'Admin' },
          hasPermission: () => true,
          hasRole: () => true,
          login: vi.fn(),
          logout: vi.fn(),
          refreshUser: vi.fn(),
          isAuthenticated: true,
          isLoading: false,
          token: 'mock-token',
        };
      }
    },
  };
});

vi.mock('@/components/ui/Toast', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useToast: () => ({
      success: vi.fn(),
      error: vi.fn(),
      showToast: vi.fn(),
    }),
  };
});
