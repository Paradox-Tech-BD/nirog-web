/**
 * Design system: Care pathway. Policy forms express authorized delivery intent,
 * never an external send, recipient address, device target, or provider secret.
 */
import type { NotificationPolicySummary } from './core-read-model';

export type NotificationPolicyForm = {
  recipientAccountId: string;
  eventClass: NotificationPolicySummary['eventClass'];
  channel: NotificationPolicySummary['channel'];
  timezone: string;
  quietHoursStart: string;
  quietHoursEnd: string;
};

export function notificationPolicyEventLabel(eventClass: NotificationPolicySummary['eventClass']): string {
  return eventClass === 'reminder_due' ? 'Reminder due' : 'Refill alert';
}

export function notificationPolicyChannelLabel(channel: NotificationPolicySummary['channel']): string {
  return ({ in_app: 'In-app', email: 'Email', push: 'Push', sms: 'SMS' })[channel];
}

export function validateNotificationPolicyForm(form: NotificationPolicyForm): string | undefined {
  if (!form.recipientAccountId) return 'Choose an eligible recipient before saving this policy.';
  if (!form.timezone.trim()) return 'A profile timezone is required for a notification policy.';
  if (Boolean(form.quietHoursStart) !== Boolean(form.quietHoursEnd)) return 'Set both quiet-hours times or leave both blank.';
  return undefined;
}

export function notificationPolicyRequest(form: NotificationPolicyForm) {
  return {
    eventClass: form.eventClass,
    channel: form.channel,
    timezone: form.timezone,
    ...(form.quietHoursStart && form.quietHoursEnd ? { quietHoursStart: form.quietHoursStart, quietHoursEnd: form.quietHoursEnd } : {}),
  };
}
