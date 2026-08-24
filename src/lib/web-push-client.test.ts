import { describe, expect, it, vi } from 'vitest';
import { awaitBrowserPushOperation, vapidKeyToUint8Array } from './web-push-client';

describe('browser Web Push boundary', () => {
  it('decodes only a supplied public VAPID key for the browser subscription API', () => {
    expect([...vapidKeyToUint8Array('AQIDBA')]).toEqual([1, 2, 3, 4]);
  });

  it('returns a recoverable error instead of waiting indefinitely for a native permission prompt', async () => {
    vi.useFakeTimers();
    const result = awaitBrowserPushOperation(new Promise<NotificationPermission>(() => undefined), 'Permission request timed out.', 25);
    const expectation = expect(result).rejects.toThrow('Permission request timed out.');
    await vi.advanceTimersByTimeAsync(25);
    await expectation;
    vi.useRealTimers();
  });
});
