/**
 * Design system: Care pathway. Browser push is activated only by a direct user action.
 * Sendable browser capabilities remain in local memory until they are immediately encrypted by Core.
 */
export type BrowserPushSubscriptionPayload = {
  installationId: string;
  deliveryTarget: string;
  webPushKeys: { p256dh: string; auth: string };
};

const installationStorageKey = 'nirog.web-push-installation.v1';

export function browserPushIsSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function vapidKeyToUint8Array(vapidPublicKey: string): Uint8Array {
  const padding = '='.repeat((4 - (vapidPublicKey.length % 4)) % 4);
  const normalized = (vapidPublicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function arrayBufferToBase64Url(value: ArrayBuffer | null): string | undefined {
  if (!value) return undefined;
  let binary = '';
  for (const byte of new Uint8Array(value)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function installationId(): string {
  const existing = window.localStorage.getItem(installationStorageKey);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.localStorage.setItem(installationStorageKey, created);
  return created;
}

export async function createBrowserPushSubscription(vapidPublicKey: string): Promise<BrowserPushSubscriptionPayload> {
  if (!browserPushIsSupported()) throw new Error('Browser push is not supported in this browser.');
  const registration = await navigator.serviceWorker.register('/nirog-push-sw.js', { scope: '/' });
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Browser notification permission was not granted.');
  const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: Uint8Array.from(vapidKeyToUint8Array(vapidPublicKey)).buffer as ArrayBuffer,
  });
  const p256dh = arrayBufferToBase64Url(subscription.getKey('p256dh'));
  const auth = arrayBufferToBase64Url(subscription.getKey('auth'));
  if (!p256dh || !auth) throw new Error('The browser did not provide complete Web Push encryption material.');
  return { installationId: installationId(), deliveryTarget: subscription.endpoint, webPushKeys: { p256dh, auth } };
}

export async function removeBrowserPushSubscription(): Promise<void> {
  if (!browserPushIsSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) await subscription.unsubscribe();
  window.localStorage.removeItem(installationStorageKey);
}
