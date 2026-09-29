import '@testing-library/jest-dom/vitest';

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Polyfill ResizeObserver for jsdom
(window as unknown as Record<string, unknown>).ResizeObserver = MockResizeObserver;
(globalThis as unknown as Record<string, unknown>).ResizeObserver = MockResizeObserver;

