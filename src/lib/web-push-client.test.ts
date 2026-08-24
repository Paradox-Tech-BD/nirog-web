import { describe, expect, it } from 'vitest';
import { vapidKeyToUint8Array } from './web-push-client';

describe('browser Web Push boundary', () => {
  it('decodes only a supplied public VAPID key for the browser subscription API', () => {
    expect([...vapidKeyToUint8Array('AQIDBA')]).toEqual([1, 2, 3, 4]);
  });
});
