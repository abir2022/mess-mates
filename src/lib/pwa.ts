import { useEffect, useState } from 'react'

/**
 * Service worker registration plus a "new version is ready" signal.
 *
 * The worker takes over immediately (skipWaiting + clients.claim) and serves
 * network-first, so reloading the page is all the app needs to pick up the new
 * build. Chrome can keep an installed PWA open for days, so we also ask the
 * browser to check for a fresh worker when the app comes back to the
 * foreground instead of waiting for the next cold start.
 */

const UPDATE_EVENT = 'mm-pwa-update'

let updateReady = false

function announce(): void {
  updateReady = true
  window.dispatchEvent(new Event(UPDATE_EVENT))
}

export function registerPwa(): void {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return

  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`)
    .then((registration) => {
      if (registration.waiting && navigator.serviceWorker.controller) announce()

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing
        if (!installing) return
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) announce()
        })
      })

      const checkForUpdate = () => {
        if (document.visibilityState !== 'visible') return
        void registration.update().catch(() => undefined)
      }
      document.addEventListener('visibilitychange', checkForUpdate)
      window.setInterval(checkForUpdate, 60 * 60 * 1000)
    })
    .catch(() => {
      /* PWA registration is optional */
    })
}

export function usePwaUpdate(): { updateReady: boolean; reload: () => void; dismiss: () => void } {
  const [ready, setReady] = useState(updateReady)

  useEffect(() => {
    const onChange = () => setReady(true)
    window.addEventListener(UPDATE_EVENT, onChange)
    return () => window.removeEventListener(UPDATE_EVENT, onChange)
  }, [])

  return {
    updateReady: ready,
    reload: () => window.location.reload(),
    dismiss: () => setReady(false),
  }
}
