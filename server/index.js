import express from 'express'
import admin from 'firebase-admin'
import cors from 'cors'
import dotenv from 'dotenv'
import axios from 'axios'
import { initEmail } from './lib/email.js'
import {
  setFirestore as setNotifyFirestore,
  dispatchNotification,
  dispatchActionNotifications,
  callerMayNotify,
} from './lib/notify.js'
import {
  setFirestore as setReminderFirestore,
  schedulePaymentReminders,
  runPaymentReminders,
} from './lib/paymentReminders.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

const SUBSCRIPTION_AMOUNT = 55000
const ADMIN_SUBSCRIPTION_AMOUNT = 120000
const TRIAL_MONTHS = 2

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  next()
})

app.use(express.json())

let firestore = null

async function initializeFirebase() {
  const serviceAccount = {
    projectId: process.env.PROJECT_ID?.trim(),
    clientEmail: process.env.CLIENT_EMAIL?.trim(),
    privateKey: process.env.PRIVATE_KEY?.replace(/\\n/g, '\n').trim(),
  }

  if (!serviceAccount.projectId) throw new Error('PROJECT_ID missing')
  if (!serviceAccount.clientEmail) throw new Error('CLIENT_EMAIL missing')
  if (!serviceAccount.privateKey) throw new Error('PRIVATE_KEY missing')

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })

  firestore = admin.firestore()
  setNotifyFirestore(firestore)
  setReminderFirestore(firestore)
  initEmail()
  console.log('Firebase Admin SDK initialized – project:', serviceAccount.projectId)
}

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1]
  if (!token) return res.status(401).json({ message: 'No token provided' })

  try {
    const decoded = await admin.auth().verifyIdToken(token)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token', error: error.message })
  }
}

async function getUserProfile(userId) {
  const snap = await firestore.doc(`users/${userId}`).get()
  return snap.exists ? snap.data() : {}
}

function getAmountForRole(role) {
  return role === 'admin' ? ADMIN_SUBSCRIPTION_AMOUNT : SUBSCRIPTION_AMOUNT
}

app.get('/', (req, res) => {
  res.json({
    message: 'SMS Pro backend running',
    amounts: { standard: SUBSCRIPTION_AMOUNT, admin: ADMIN_SUBSCRIPTION_AMOUNT },
    reminders: [14, 7, 3, 1],
  })
})

app.options('/api/charge-mobile-money', (req, res) => {
  res.sendStatus(200)
})

/** Dispatch in-app + email notification (used by React app) */
app.post('/api/dispatch-notification', verifyToken, async (req, res) => {
  try {
    const { recipientId, type, title, message, actorId, actorName, metadata, forceEmail } = req.body
    if (!recipientId || !title || !message) {
      return res.status(400).json({ message: 'recipientId, title, and message are required' })
    }

    const allowed = await callerMayNotify(req.user.uid, recipientId)
    if (!allowed) {
      return res.status(403).json({ message: 'Not allowed to notify this user' })
    }

    const result = await dispatchNotification(
      recipientId,
      {
        type: type || 'team',
        title,
        message,
        actorId: actorId || req.user.uid,
        actorName: actorName || 'SMS Pro',
        metadata: metadata || {},
      },
      { forceEmail: !!forceEmail },
    )

    res.json({ ok: true, ...result })
  } catch (err) {
    console.error('dispatch-notification error:', err)
    res.status(500).json({ message: err.message })
  }
})

/** Notify actor + managing admin when a user performs a workspace action */
app.post('/api/notify-action', verifyToken, async (req, res) => {
  try {
    const { action, entity, entityName, metadata } = req.body
    if (!action || !entity) {
      return res.status(400).json({ message: 'action and entity are required' })
    }

    const profile = await getUserProfile(req.user.uid)
    if (profile.approvalStatus === 'pending') {
      return res.status(403).json({ message: 'Account pending approval.' })
    }

    const allowedActions = ['created', 'updated', 'deleted']
    if (!allowedActions.includes(action)) {
      return res.status(400).json({ message: 'Invalid action' })
    }

    const allowedEntities = ['student', 'course', 'cohort', 'payment']
    if (!allowedEntities.includes(entity)) {
      return res.status(400).json({ message: 'Invalid entity' })
    }

    const result = await dispatchActionNotifications(req.user.uid, {
      action,
      entity,
      entityName: entityName || '',
      metadata: metadata || {},
    })

    res.json({ ok: true, ...result })
  } catch (err) {
    console.error('notify-action error:', err)
    res.status(500).json({ message: err.message })
  }
})

/** Manual trigger for payment reminders (super-admin cron test) */
app.post('/api/run-payment-reminders', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (profile.role !== 'super-admin') {
      return res.status(403).json({ message: 'Super-admin only' })
    }
    const result = await runPaymentReminders()
    res.json(result)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// START FREE TRIAL
app.post('/api/start-free-trial', verifyToken, async (req, res) => {
  const userId = req.user.uid
  try {
    const profile = await getUserProfile(userId)
    if (profile.role === 'super-admin') {
      return res.status(403).json({ message: 'Super admins do not require a subscription.' })
    }
    if (profile.approvalStatus === 'pending') {
      return res.status(403).json({ message: 'Account pending super-admin approval.' })
    }
    if (profile.approvalStatus === 'rejected') {
      return res.status(403).json({ message: 'Account was rejected. Contact support.' })
    }
    if (profile.hasUsedTrial) {
      return res.status(400).json({ message: 'You have already used your free trial.' })
    }

    const now = new Date()
    const end = new Date(now)
    end.setMonth(end.getMonth() + TRIAL_MONTHS)

    await firestore.doc(`users/${userId}`).set(
      {
        subscriptionstartdate: now.toISOString(),
        subscriptionenddate: end.toISOString(),
        hasUsedTrial: true,
      },
      { merge: true },
    )

    await dispatchNotification(userId, {
      type: 'subscription',
      title: 'Free trial started',
      message: `Your ${TRIAL_MONTHS}-month trial is active until ${end.toLocaleDateString('en-GB')}.`,
      actorId: userId,
      actorName: profile.fullName || 'System',
      metadata: { endDate: end.toISOString() },
    })

    res.json({ message: `${TRIAL_MONTHS}-month free trial started`, endDate: end.toISOString() })
  } catch (err) {
    console.error('Trial error:', err)
    res.status(500).json({ message: 'Failed to start trial', error: err.message })
  }
})

// CHARGE MOBILE MONEY
app.post('/api/charge-mobile-money', verifyToken, async (req, res) => {
  const userId = req.user.uid
  const profile = await getUserProfile(userId)
  const role = profile.role || 'student'

  if (role === 'super-admin') {
    return res.status(403).json({ message: 'Super admins manage the platform — no subscription required.' })
  }
  if (profile.approvalStatus === 'pending') {
    return res.status(403).json({ message: 'Account pending super-admin approval.' })
  }

  const defaultAmount = getAmountForRole(role)
  const { amount = defaultAmount, currency = 'MWK', phone, provider } = req.body

  if (!phone || !provider) {
    return res.status(400).json({ message: 'Missing phone or provider' })
  }
  if (!phone.match(/^\+265(99|88)\d{7}$/)) {
    return res.status(400).json({ message: 'Invalid phone format' })
  }

  const providerMap = { airtel: 'airtel_money', tnm: 'tnm_mpamba' }
  if (!providerMap[provider]) {
    return res.status(400).json({ message: 'Invalid provider' })
  }

  try {
    const userRecord = await admin.auth().getUser(userId)
    const [firstName = 'User', lastName = ''] = (userRecord.displayName || profile.fullName || '').split(' ')
    const txRef = `${userId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const planLabel = role === 'admin' ? 'Admin Plan' : 'Pro Plan'

    const payload = {
      amount: amount.toString(),
      currency,
      email: userRecord.email,
      first_name: firstName,
      last_name: lastName,
      callback_url: 'https://myserver.ibratechinnovations.com/payment-callback',
      return_url: 'https://sms.ibratechinnovations.com/subscription?status=completed',
      tx_ref: txRef,
      customization: {
        title: `SMS Pro ${planLabel}`,
        description: `Monthly access (${Number(amount).toLocaleString()} MWK)`,
      },
      meta: {
        uuid: userId,
        phone,
        provider: providerMap[provider],
        role,
        plan: planLabel,
      },
    }

    const response = await callPayChanguAPI('payment', payload)

    if (response.data.status === 'success' && response.data.data?.checkout_url) {
      await firestore.doc(`users/${userId}/Payments/${txRef}`).set({
        userId,
        email: userRecord.email,
        amount,
        role,
        tx_ref: txRef,
        checkout_url: response.data.data.checkout_url,
        status: 'pending',
        createdAt: admin.firestore.Timestamp.now(),
        phone,
        provider: providerMap[provider],
      })

      res.json({
        message: 'Payment initiated',
        checkout_url: response.data.data.checkout_url,
        tx_ref: txRef,
        amount,
        plan: planLabel,
      })
    } else {
      res.status(500).json({ message: 'No checkout URL', data: response.data })
    }
  } catch (err) {
    console.error('Charge error:', err)
    res.status(500).json({ message: 'Payment failed', error: err.message })
  }
})

app.get('/api/check-payment/:tx_ref', verifyToken, async (req, res) => {
  const { tx_ref } = req.params
  const userId = req.user.uid

  try {
    const paymentRef = firestore.doc(`users/${userId}/Payments/${tx_ref}`)
    const docSnap = await paymentRef.get()
    if (!docSnap.exists || docSnap.data().userId !== userId) {
      return res.status(404).json({ message: 'Not found' })
    }

    const data = docSnap.data()
    if (data.status !== 'pending') {
      return res.json({ status: data.status })
    }

    const result = await verifyPayment(tx_ref)
    const success = result.status === 'success'
    const paidAmount = data.amount || SUBSCRIPTION_AMOUNT

    await paymentRef.update({
      status: success ? 'successful' : 'failed',
      verifiedAt: admin.firestore.Timestamp.now(),
    })

    if (success) {
      await updateSubscription(userId, paidAmount)
      const profile = await getUserProfile(userId)
      const end = new Date()
      const snap = await firestore.doc(`users/${userId}`).get()
      const endDate = snap.data()?.subscriptionenddate
      if (endDate) end.setTime(new Date(endDate).getTime())

      await dispatchNotification(userId, {
        type: 'payment',
        title: 'Payment successful',
        message: `Your subscription has been extended. Amount: ${paidAmount.toLocaleString()} MWK. Active until ${end.toLocaleDateString('en-GB')}.`,
        actorId: userId,
        actorName: profile.fullName || 'System',
        metadata: { tx_ref, amount: paidAmount },
      })

      res.json({ status: 'successful', endDate: end.toISOString() })
    } else {
      res.json({ status: 'failed', error: result.message })
    }
  } catch (err) {
    res.status(500).json({ message: 'Check failed', error: err.message })
  }
})

async function callPayChanguAPI(endpoint, payload, method = 'post') {
  const config = {
    headers: {
      Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 55000,
  }

  return method === 'post'
    ? axios.post(`https://api.paychangu.com/${endpoint}`, payload, config)
    : axios.get(`https://api.paychangu.com/${endpoint}`, config)
}

async function verifyPayment(tx_ref) {
  try {
    const res = await callPayChanguAPI(`verify-payment/${tx_ref}`, null, 'get')
    return res.data
  } catch (err) {
    return { status: 'failed', message: err.message }
  }
}

async function updateSubscription(userId, amount) {
  const userRef = firestore.doc(`users/${userId}`)
  const snap = await userRef.get()
  const data = snap.data() || {}
  const role = data.role || 'student'
  const unitAmount = getAmountForRole(role)
  const now = new Date()
  let end = new Date(now)

  if (data.subscriptionenddate && new Date(data.subscriptionenddate) > now) {
    end = new Date(data.subscriptionenddate)
  }
  end.setMonth(end.getMonth() + Math.max(1, Math.floor(amount / unitAmount)))

  await userRef.set(
    {
      subscriptionstartdate: now.toISOString(),
      subscriptionenddate: end.toISOString(),
      hasUsedTrial: data.hasUsedTrial || false,
      paymentRemindersSent: {},
    },
    { merge: true },
  )
}

app.get('/payment-callback', async (req, res) => {
  const { tx_ref, status } = req.query
  if (!tx_ref) {
    return res.redirect(
      'https://sms.ibratechinnovations.com/subscription?status=not paid&error=Missing tx_ref',
    )
  }
  res.redirect(`https://sms.ibratechinnovations.com/subscription?status=${status}&tx_ref=${tx_ref}`)
})

app.post('/api/payment-webhook', async (req, res) => {
  console.log('Webhook:', req.body)
  res.json({ message: 'OK' })
})

app.use((err, req, res, next) => {
  console.error('Server error:', err)
  res.status(500).json({ message: 'Internal Error' })
})

async function startServer() {
  try {
    await initializeFirebase()
    const reminderMs = Number(process.env.REMINDER_CRON_MS) || 24 * 60 * 60 * 1000
    schedulePaymentReminders(reminderMs)

    app.listen(PORT, () => {
      console.log(`SMS Pro server running on port ${PORT}`)
    })
  } catch (err) {
    console.error('Failed to start:', err)
    process.exit(1)
  }
}

startServer()

export default app
