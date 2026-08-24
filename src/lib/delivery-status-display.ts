/**
 * Design system: Care pathway. This pure projection keeps configuration readiness,
 * provider lifecycle metadata, in-app delivery, read state, and adherence distinct.
 */
import type { ExternalDeliveryAttemptSummary, ExternalDeliveryStatusSummary } from './core-read-model';

export type DeliveryStatusDisplay = {
  label: string;
  detail: string;
  attemptDetail: string;
};

function latestAttempt(attempts: readonly ExternalDeliveryAttemptSummary[]) {
  return [...attempts].sort((left, right) => {
    const leftTime = Date.parse(left.lastAttemptAt ?? left.createdAt);
    const rightTime = Date.parse(right.lastAttemptAt ?? right.createdAt);
    return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
  })[0];
}

export function deliveryStatusDisplay(
  status: ExternalDeliveryStatusSummary | null,
  attempts: readonly ExternalDeliveryAttemptSummary[],
): DeliveryStatusDisplay {
  if (!status || status.state === 'disabled') {
    return {
      label: 'External delivery is not configured',
      detail: 'In-app reminder records remain active when they are delivered to the durable inbox. No email, SMS, or push message is implied.',
      attemptDetail: 'No external provider is active, so there is no external delivery to report.',
    };
  }

  const latest = latestAttempt(attempts);
  if (!latest) {
    return {
      label: 'External email provider is ready',
      detail: 'Provider readiness is configuration state only. It does not show that an email was sent, delivered, read, or acted on.',
      attemptDetail: 'No external provider attempt has been recorded for this profile.',
    };
  }

  const lifecycle = {
    accepted: 'The provider accepted the attempt; acceptance is not delivery.',
    failed: 'The provider recorded the attempt as failed.',
    delivered: 'The provider reported the attempt as delivered; delivery is not read or adherence evidence.',
    bounced: 'The provider reported the attempt as bounced.',
  }[latest.status];

  return {
    label: 'External email provider is ready',
    detail: 'Provider readiness is configuration state only. It does not show that an email was sent, delivered, read, or acted on.',
    attemptDetail: lifecycle,
  };
}
