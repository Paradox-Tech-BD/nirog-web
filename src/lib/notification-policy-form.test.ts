import { describe, expect, it } from 'vitest';
import { notificationPolicyRequest, validateNotificationPolicyForm } from './notification-policy-form';

const base = { recipientAccountId: 'recipient', eventClass: 'reminder_due' as const, channel: 'push' as const, timezone: 'Asia/Dhaka', quietHoursStart: '', quietHoursEnd: '' };

describe('notification policy form boundary', () => {
  it('requires a complete quiet-hours pair', () => {
    expect(validateNotificationPolicyForm({ ...base, quietHoursStart: '22:00' })).toContain('both quiet-hours');
    expect(validateNotificationPolicyForm({ ...base, quietHoursStart: '22:00', quietHoursEnd: '07:00' })).toBeUndefined();
  });

  it('serializes only the existing safe Core policy command fields', () => {
    expect(notificationPolicyRequest({ ...base, quietHoursStart: '22:00', quietHoursEnd: '07:00' })).toEqual({ eventClass: 'reminder_due', channel: 'push', timezone: 'Asia/Dhaka', quietHoursStart: '22:00', quietHoursEnd: '07:00' });
    expect(notificationPolicyRequest(base)).toEqual({ eventClass: 'reminder_due', channel: 'push', timezone: 'Asia/Dhaka' });
  });
});
