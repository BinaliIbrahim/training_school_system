import admin from 'firebase-admin'
import { sendEmail, buildNotificationHtml, APP_URL } from './email.js'

let firestore = null

export function setFirestore(db) {
  firestore = db
}

async function getUserProfile(userId) {
  const snap = await firestore.doc(`users/${userId}`).get()
  return snap.exists ? { id: userId, ...snap.data() } : null
}

function shouldSendEmail(profile, payload, options = {}) {
  if (options.forceEmail) return true
  if (!profile?.email) return false
  const prefs = profile.preferences || {}
  if (prefs.emailNotifications === false) return false
  const billingTypes = ['subscription', 'payment']
  if (billingTypes.includes(payload.type) && prefs.paymentAlerts === false) return false
  return true
}

function emailCtaForType(type) {
  if (type === 'subscription' || type === 'payment') {
    return { label: 'Renew subscription', url: `${APP_URL}/subscription` }
  }
  if (type === 'user_created' || type === 'user_approved') {
    return { label: 'Open dashboard', url: `${APP_URL}/admin/users` }
  }
  if (type === 'action' || type === 'team_action') {
    return { label: 'Open dashboard', url: `${APP_URL}/dashboard` }
  }
  return { label: 'Open SMS Pro', url: APP_URL }
}

/** Send FCM web push when the user has registered tokens */
async function sendPushToUser(profile, payload) {
  const tokens = profile?.fcmTokens || []
  if (!tokens.length) return { pushSent: 0 }

  const prefs = profile.preferences || {}
  if (prefs.pushNotifications === false) return { pushSent: 0 }

  try {
    const messaging = admin.messaging()
    const result = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: payload.title,
        body: payload.message,
      },
      data: {
        type: payload.type || 'team',
        click_action: APP_URL,
      },
      webpush: {
        fcmOptions: { link: APP_URL },
      },
    })

    const stale = []
    result.responses.forEach((res, i) => {
      if (
        !res.success &&
        (res.error?.code === 'messaging/registration-token-not-registered' ||
          res.error?.code === 'messaging/invalid-registration-token')
      ) {
        stale.push(tokens[i])
      }
    })

    if (stale.length && firestore) {
      await firestore.doc(`users/${profile.id}`).update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...stale),
      })
    }

    return { pushSent: result.successCount }
  } catch (err) {
    console.warn('FCM push skipped:', err.message)
    return { pushSent: 0 }
  }
}

export async function resolveManagingAdminIds(actor) {
  const ids = new Set()

  if (actor.managedBy) ids.add(actor.managedBy)
  if (actor.createdBy && !['admin', 'super-admin'].includes(actor.role)) {
    ids.add(actor.createdBy)
  }

  if (actor.role === 'admin') {
    const snap = await firestore.collection('users').where('role', '==', 'super-admin').get()
    snap.docs.forEach((d) => ids.add(d.id))
  }

  return [...ids]
}

/** Notify the actor + their managing admin(s) after a workspace action */
export async function dispatchActionNotifications(actorId, { action, entity, entityName, metadata = {} }) {
  const actor = await getUserProfile(actorId)
  if (!actor) throw new Error('User profile not found')

  const verbs = { created: 'created', updated: 'updated', deleted: 'deleted' }
  const verb = verbs[action] || action
  const entityLabel = entity ? entity.charAt(0).toUpperCase() + entity.slice(1) : 'Record'
  const namePart = entityName ? ` "${entityName}"` : ''
  const actorName = actor.fullName || actor.email || 'A user'

  const baseMeta = { action, entity, entityName: entityName || null, ...metadata }

  await dispatchNotification(
    actorId,
    {
      type: 'action',
      title: `${entityLabel} ${verb}`,
      message: `You successfully ${verb} ${entity}${namePart}.`,
      actorId,
      actorName,
      metadata: baseMeta,
    },
    { push: true },
  )

  const adminIds = await resolveManagingAdminIds(actor)
  for (const adminId of adminIds) {
    if (adminId === actorId) continue
    await dispatchNotification(
      adminId,
      {
        type: 'team_action',
        title: `Team update: ${entityLabel} ${verb}`,
        message: `${actorName} ${verb} ${entity}${namePart}.`,
        actorId,
        actorName,
        metadata: { ...baseMeta, teamMemberId: actorId },
      },
      { push: true },
    )
  }

  return { actorId, adminIds: adminIds.filter((id) => id !== actorId) }
}

export async function writeInAppNotification(recipientId, payload) {
  if (!recipientId) return null
  const ref = await firestore.collection(`users/${recipientId}/notifications`).add({
    ...payload,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })
  return ref.id
}

/** In-app notification + optional email + optional FCM push */
export async function dispatchNotification(recipientId, payload, options = {}) {
  const notificationId = await writeInAppNotification(recipientId, payload)
  const profile = await getUserProfile(recipientId)

  let emailSent = false
  if (profile && shouldSendEmail(profile, payload, options)) {
    const cta = emailCtaForType(payload.type)
    const html = buildNotificationHtml({
      title: payload.title,
      message: payload.message,
      ctaLabel: cta.label,
      ctaUrl: cta.url,
    })

    const result = await sendEmail({
      to: profile.email,
      subject: `[SMS Pro] ${payload.title}`,
      text: `${payload.message}\n\n${cta.url}`,
      html,
    })
    emailSent = result.sent
  }

  let pushSent = 0
  if (options.push !== false && profile) {
    const pushResult = await sendPushToUser(profile, payload)
    pushSent = pushResult.pushSent
  }

  return { notificationId, emailSent, pushSent }
}

export async function callerMayNotify(callerUid, recipientId) {
  if (callerUid === recipientId) return true
  const caller = await getUserProfile(callerUid)
  if (!caller) return false
  if (caller.role === 'super-admin') return true
  if (caller.role === 'admin') {
    const managed = caller.managedUserIds || []
    if (managed.includes(recipientId)) return true
    const recipient = await getUserProfile(recipientId)
    if (recipient?.role === 'super-admin') return true
  }
  return false
}
