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
