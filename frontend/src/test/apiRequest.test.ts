import { describe, it, expect, vi, afterEach } from 'vitest';
import { request } from '@/services/api';

const mockFetch = (status: number, body?: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  );

describe('request()', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns undefined for 204 No Content', async () => {
    mockFetch(204);
    await expect(request('/x', { method: 'POST' })).resolves.toBeUndefined();
  });

  it('turns 422 validation lists into readable messages', async () => {
    mockFetch(422, { detail: [{ msg: 'String should have at least 8 characters' }] });
    await expect(request('/x')).rejects.toThrow('String should have at least 8 characters');
  });

  it('keeps string details', async () => {
    mockFetch(400, { detail: 'Senha atual incorreta' });
    await expect(request('/x')).rejects.toThrow('Senha atual incorreta');
  });
});
