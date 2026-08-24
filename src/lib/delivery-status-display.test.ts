import { describe, expect, it } from 'vitest';
import { deliveryStatusDisplay } from './delivery-status-display';

describe('deliveryStatusDisplay', () => {
  it('does not imply an external message when the provider is disabled', () => {
    const display = deliveryStatusDisplay({ provider: 'disabled', state: 'disabled' }, []);
    expect(display.label).toContain('not configured');
    expect(display.detail).toContain('No email, SMS, or push message is implied');
  });

  it('distinguishes provider readiness from delivery when no attempt exists', () => {
    const display = deliveryStatusDisplay({ provider: 'resend_email', state: 'ready', channel: 'email' }, []);
    expect(display.detail).toContain('does not show that an email was sent, delivered, read, or acted on');
    expect(display.attemptDetail).toContain('No external provider attempt');
  });

  it('keeps provider-reported delivery separate from read and adherence', () => {
    const display = deliveryStatusDisplay({ provider: 'resend_email', state: 'ready', channel: 'email' }, [{
      id: 'attempt', profileId: 'profile', regimenId: 'regimen', reminderOccurrenceId: 'occurrence', channel: 'email', provider: 'resend', status: 'delivered', attemptCount: 1, createdAt: '2026-08-24T00:00:00.000Z',
    }]);
    expect(display.attemptDetail).toContain('provider reported');
    expect(display.attemptDetail).toContain('not read or adherence evidence');
  });
});
