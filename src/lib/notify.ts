/**
 * Device notifications, delivered through the service worker.
 *
 * `new Notification()` dies with the page it was created in; a notification
 * shown by the registration survives a tab switch and survives the install
 * prompt, which is what a daily nudge needs. The page notification stays as a
 * fallback for browsers that have no worker yet.
 *
 * This is not Web Push: nothing is delivered while the app is closed, because
 * that needs a VAPID key and a server-side send step. The copy in the UI says so.
 */
export async function showDeviceNotification(
  title: string,
  body: string,
  tag = 'mess-mates-reminders',
): Promise<boolean> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false

  const options: NotificationOptions = {
    body,
    icon: '/logo.png',
    badge: '/logo.png',
    tag,
    data: { url: '/' },
  }

  try {
    const registration =
      typeof navigator !== 'undefined' && 'serviceWorker' in navigator
        ? await navigator.serviceWorker.ready
        : null
    if (registration) {
      await registration.showNotification(title, options)
      return true
    }
  } catch {
    // Fall through to the page notification.
  }

  try {
    new Notification(title, options)
    return true
  } catch {
    return false
  }
}
