import { describe, it, expect, beforeEach } from 'vitest';
import { takeUnnotified, notificationPermission } from '@/lib/notifications';

describe('lib/notifications', () => {
  beforeEach(() => localStorage.clear());

  it('returns each id only once across polls', () => {
    expect(takeUnnotified([1, 2])).toEqual([1, 2]);
    expect(takeUnnotified([1, 2, 3])).toEqual([3]);
    expect(takeUnnotified([3])).toEqual([]);
  });

  it('reports unsupported outside a secure context with Notification API', () => {
    // jsdom não tem Notification: o sino continua funcionando sem avisos do sistema
    expect(notificationPermission()).toBe('unsupported');
  });
});
