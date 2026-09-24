import { describe, it, expect, afterEach } from 'vitest';
import { getApiBase } from '@/services/api';

describe('API base URL resolver', () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('resolves dynamic API host matching the browser hostname when accessing via network IP', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        protocol: 'http:',
        hostname: '10.0.29.220',
        port: '5173',
      },
    });

    expect(getApiBase()).toBe('http://10.0.29.220:8088');
  });

  it('resolves localhost when accessing locally', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        protocol: 'http:',
        hostname: 'localhost',
        port: '5173',
      },
    });

    expect(getApiBase()).toBe('http://localhost:8088');
  });
});
