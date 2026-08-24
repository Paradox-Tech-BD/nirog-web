/**
 * Design system: Care pathway. Account-self browser opt-in never implies a provider send,
 * and requests browser permission only after the person activates the control.
 */
'use client';

import { BellOff, BellRing, CheckCircle2, CircleDashed, LoaderCircle, ShieldCheck, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { coreMessage, readCore } from '@/lib/core-read-model';
import { browserPushIsSupported, createBrowserPushSubscription, removeBrowserPushSubscription } from '@/lib/web-push-client';

type WebPushCapability = { available: boolean; vapidPublicKey?: string };
type RegistrationSummary = { id: string; provider: 'fcm' | 'web_push'; platform: 'ios' | 'android' | 'web'; status: 'active' | 'revoked' | 'invalid'; lastSyncedAt: string; invalidatedAt?: string; revokedAt?: string };
type PushState = { phase: 'loading' | 'unavailable' | 'ready' | 'registering' | 'registered' | 'revoking'; capability?: WebPushCapability; registration?: RegistrationSummary; message?: string };

export function BrowserPushRegistrationCard() {
  const [state, setState] = useState<PushState>({ phase: 'loading' });

  const loadCapability = useCallback(async () => {
    try {
      const capability = await readCore<WebPushCapability>('delivery-registrations/web-push/config');
      if (!capability.available || !capability.vapidPublicKey) {
        setState({ phase: 'unavailable', capability, message: 'Browser push setup is not configured in this environment. No browser permission has been requested.' });
        return;
      }
      setState({ phase: 'ready', capability });
    } catch {
      setState({ phase: 'unavailable', message: 'Browser push setup is not available in this environment. No browser permission has been requested.' });
    }
  }, []);

  useEffect(() => { void loadCapability(); }, [loadCapability]);

  const register = async () => {
    if (!state.capability?.vapidPublicKey || !browserPushIsSupported()) return;
    try {
      setState((current) => ({ ...current, phase: 'registering', message: undefined }));
      const subscription = await createBrowserPushSubscription(state.capability.vapidPublicKey);
      const registration = await readCore<RegistrationSummary>('delivery-registrations', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': `web-push-registration-${crypto.randomUUID()}` },
        body: JSON.stringify({ provider: 'web_push', platform: 'web', ...subscription }),
      });
      setState({ phase: 'registered', capability: state.capability, registration, message: 'This browser registration is encrypted in Core. No push notification has been sent.' });
    } catch (error) {
      setState((current) => ({ ...current, phase: 'ready', message: coreMessage(error, 'This browser could not complete push registration. No push notification was sent.') }));
    }
  };

  const revoke = async () => {
    if (!state.registration) return;
    try {
      setState((current) => ({ ...current, phase: 'revoking', message: undefined }));
      await readCore<void>(`delivery-registrations/${state.registration.id}`, {
        method: 'DELETE',
        headers: { 'idempotency-key': `web-push-revocation-${crypto.randomUUID()}` },
      });
      await removeBrowserPushSubscription();
      setState({ phase: 'ready', capability: state.capability, message: 'This browser registration was revoked. No provider message was sent.' });
    } catch (error) {
      setState((current) => ({ ...current, phase: 'registered', message: coreMessage(error, 'The Core registration could not be revoked. No provider message was sent.') }));
    }
  };

  const browserSupported = browserPushIsSupported();
  return <section className="push-setup-card" aria-live="polite"><div className="plan-panel-heading"><div><p className="eyebrow">This browser</p><h2>Prepare browser push access</h2></div>{state.phase === 'registered' || state.phase === 'revoking' ? <CheckCircle2 size={20} /> : <BellRing size={20} />}</div><p>Push permission is requested only after you choose to set up this browser. Registration stores the browser endpoint and encryption material only through Core’s encrypted registration boundary.</p>{state.phase === 'loading' ? <p className="state-line"><LoaderCircle className="spin" size={17} /> Checking browser push capability…</p> : state.phase === 'unavailable' ? <div className="push-setup-state"><BellOff size={17} /><span>{state.message}</span></div> : !browserSupported ? <div className="push-setup-state"><BellOff size={17} /><span>This browser does not provide the required service worker, Push API, and Notification API support.</span></div> : (state.phase === 'registered' || state.phase === 'revoking') && state.registration ? <><div className="push-setup-state push-setup-state-ready"><ShieldCheck size={17} /><span>{state.message}</span></div><button className="button button-secondary" disabled={state.phase === 'revoking'} onClick={() => void revoke()} type="button"><Trash2 size={16} /> {state.phase === 'revoking' ? 'Revoking browser…' : 'Revoke this browser'}</button></> : <><div className="push-setup-state"><CircleDashed size={17} /><span>{state.message ?? 'No browser registration has been created from this page.'}</span></div><button className="button button-primary" disabled={state.phase === 'registering'} onClick={() => void register()} type="button"><BellRing size={16} /> {state.phase === 'registering' ? 'Setting up browser…' : 'Set up browser push'}</button></>}</section>;
}
