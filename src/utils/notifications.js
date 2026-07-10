import { auth } from '../firebase'
import { API_BASE_URL } from './subscription'

export const NOTIFICATION_TYPES = {
  USER_CREATED: 'user_created',
  USER_APPROVED: 'user_approved',
  USER_REJECTED: 'user_rejected',
  USER_FIRED: 'user_fired',
  DATA_TRANSFERRED: 'data_transferred',
  CRUD_TOGGLED: 'crud_toggled',
  SUBSCRIPTION: 'subscription',
  PAYMENT: 'payment',
  PAYMENT_REMINDER: 'payment_reminder',
  TEAM: 'team',
  ACTION: 'action',
  TEAM_ACTION: 'team_action',
}

/**
 * Dispatch in-app + email notification via server (SendGrid + Firestore).
 * Falls back silently if user is not signed in or API is unreachable.
 */
export async function notifyUser({
  recipientId,
  type,
  title,
  message,
  actorId = null,
  actorName = null,
  metadata = {},
  forceEmail = false,
}) {
  if (!recipientId) return null

  try {
    const user = auth.currentUser
    if (!user) {
      console.warn('notifyUser: no auth session — notification skipped')
      return null
    }

    const idToken = await user.getIdToken()
    const response = await fetch(`${API_BASE_URL}/api/dispatch-notification`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipientId,
        type,
        title,
        message,
        actorId,
        actorName,
        metadata,
        forceEmail,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      console.error('Notification API error:', err.message || response.status)
      return null
    }

    const data = await response.json()
    return data.notificationId
  } catch (err) {
    console.error('Failed to send notification:', err)
    return null
  }
}

/** Notify multiple recipients */
export async function notifyUsers(recipients, payload) {
  await Promise.all(recipients.filter(Boolean).map((id) => notifyUser({ ...payload, recipientId: id })))
}

/**
 * After a successful CRUD action — notifies the actor and their managing admin(s).
 * Fire-and-forget; never blocks the UI on failure.
 */
export async function notifyAction({ action, entity, entityName, metadata = {} }) {
  try {
    const user = auth.currentUser
    if (!user) return null

    const idToken = await user.getIdToken()
    const response = await fetch(`${API_BASE_URL}/api/notify-action`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, entity, entityName, metadata }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      console.warn('Action notification skipped:', err.message || response.status)
      return null
    }

    return response.json()
  } catch (err) {
    console.warn('Action notification failed:', err.message)
    return null
  }
}

/** Shorthand for common dashboard operations */
export const notifyCrud = (action, entity, entityName, metadata) =>
  notifyAction({ action, entity, entityName, metadata })
