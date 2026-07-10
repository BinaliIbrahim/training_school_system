import { useEffect, useRef } from 'react'

import { LOGO_ICON } from '../constants/brand'

const ICON = LOGO_ICON

/** Request browser notification permission once */
export async function requestPushPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

function showBrowserNotification({ title, body, tag }) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const opts = {
    body,
    icon: ICON,
    badge: ICON,
    tag: tag || title,
    renotify: true,
  }

  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => reg.showNotification(title, opts))
        .catch(() => new Notification(title, opts))
    } else {
      new Notification(title, opts)
    }
  } catch {
    /* ignore — in-app bell still works */
  }
}

/**
 * Show native browser push when new unread notifications arrive (Firestore live sync).
 */
export function useBrowserPush(notifications, enabled = true) {
  const seenRef = useRef(new Set())
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!enabled) return
    requestPushPermission()
  }, [enabled])

  useEffect(() => {
    if (!enabled || !notifications?.length) return

    notifications.forEach((n) => {
      if (initializedRef.current && !n.read && !seenRef.current.has(n.id)) {
        showBrowserNotification({
          title: n.title || 'SMS Pro',
          body: n.message || '',
          tag: n.id,
        })
      }
      seenRef.current.add(n.id)
    })

    initializedRef.current = true
  }, [notifications, enabled])
}

export default useBrowserPush
