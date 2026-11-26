import type { Backend } from './backend'

/**
 * Web Push.
 *
 * The browser subscription is created here and stored per account/mess by the
 * backend. Delivery happens in the `send-push` Supabase Edge Function, which
 * holds the VAPID private key; the browser only ever sees the public key, and
 * only when the project sets VITE_VAPID_PUBLIC_KEY.
 *
 * Without that key the app falls back to the on-device reminder it already had
 * (a service-worker notification while the app is open), and the UI says so.
 */

export const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '').trim()

export type PushResult = 'granted' | 'denied' | 'unsupported' | 'unconfigured' | 'failed'

export function pushConfigured(): boolean {
  return VAPID_PUBLIC_KEY.length > 0
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    typeof Notification !== 'undefined'
  )
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  const bytes = new Uint8Array(raw.length)
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index)
  return bytes
}

export async function currentPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  try {
    const registration = await navigator.serviceWorker.ready
    return await registration.pushManager.getSubscription()
  } catch {
    return null
  }
}

export async function enablePush(backend: Backend): Promise<PushResult> {
  if (!pushConfigured() || !pushSupported()) return 'unconfigured'

  try {
    const permission =
      Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission()
    if (permission !== 'granted') return 'denied'

    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      }))

    const json = subscription.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return 'failed'

    await backend.savePushSubscription({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      userAgent: navigator.userAgent.slice(0, 180),
    })
    return 'granted'
  } catch {
    return 'failed'
  }
}

export async function disablePush(backend: Backend): Promise<void> {
  const subscription = await currentPushSubscription()
  if (!subscription) return
  try {
    await backend.removePushSubscription(subscription.endpoint)
  } catch {
    // The server row can be cleaned up later; still stop this device.
  }
  try {
    await subscription.unsubscribe()
  } catch {
    // Nothing else to do.
  }
}
