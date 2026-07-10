import admin from 'firebase-admin'
import { dispatchNotification } from './notify.js'

const REMINDER_DAYS = [14, 7, 3, 1]
const ADMIN_AMOUNT = 120000

let firestore = null

export function setFirestore(db) {
  firestore = db
}

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/**
 * Daily job: email admins at 14, 7, 3, and 1 day(s) before subscriptionenddate.
 * Tracks sent reminders on user.paymentRemindersSent to avoid duplicates.
 */
export async function runPaymentReminders() {
  if (!firestore) return { checked: 0, sent: 0 }

  console.log('[reminders] Running admin payment reminder scan...')
  const today = startOfDay(new Date())
  let checked = 0
  let sent = 0

  try {
    const snap = await firestore.collection('users').where('role', '==', 'admin').get()

    for (const docSnap of snap.docs) {
      checked += 1
      const data = docSnap.data()
      const uid = docSnap.id
      const endRaw = data.subscriptionenddate
      if (!endRaw) continue

      const endDate = startOfDay(new Date(endRaw))
      if (isNaN(endDate.getTime()) || endDate <= today) continue

      const prefs = data.preferences || {}
      if (prefs.paymentAlerts === false) continue

      const remindersSent = data.paymentRemindersSent || {}

      for (const days of REMINDER_DAYS) {
        const triggerDay = new Date(endDate)
        triggerDay.setDate(triggerDay.getDate() - days)

        if (triggerDay.getTime() !== today.getTime()) continue

        const key = `${endDate.toISOString().slice(0, 10)}_${days}d`
        if (remindersSent[key]) continue

        const dayLabel = days === 1 ? '1 day' : `${days} days`
        const title = `Subscription renews in ${dayLabel}`
        const message = `Hi ${data.fullName || 'Admin'}, your SMS Pro Admin Plan (MWK ${ADMIN_AMOUNT.toLocaleString()}/month) expires on ${endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. Renew now to keep your school dashboard, team, and student data accessible without interruption.`

        await dispatchNotification(
          uid,
          {
            type: 'subscription',
            title,
            message,
            actorId: 'system',
            actorName: 'SMS Pro Billing',
            metadata: { reminder: true, daysUntilDue: days, endDate: endDate.toISOString() },
          },
          { forceEmail: true },
        )

        await firestore.doc(`users/${uid}`).update({
          [`paymentRemindersSent.${key}`]: admin.firestore.FieldValue.serverTimestamp(),
        })

        sent += 1
        console.log(`[reminders] Sent ${days}-day reminder to ${data.email}`)
      }
    }
  } catch (err) {
    console.error('[reminders] Error:', err.message)
  }

  console.log(`[reminders] Done — checked ${checked} admins, sent ${sent} reminders`)
  return { checked, sent }
}

export function schedulePaymentReminders(intervalMs = 24 * 60 * 60 * 1000) {
  runPaymentReminders()
  setInterval(runPaymentReminders, intervalMs)
  console.log(`[reminders] Scheduled every ${intervalMs / 3600000}h`)
}
