export const TRIAL_MONTHS = 2
export const SUBSCRIPTION_AMOUNT = 55000
export const ADMIN_SUBSCRIPTION_AMOUNT = 120000
export const API_BASE_URL = 'https://myserver.ibratechinnovations.com'

/** Role-based monthly subscription price (MWK) */
export const getSubscriptionAmount = (role) =>
  role === 'admin' ? ADMIN_SUBSCRIPTION_AMOUNT : SUBSCRIPTION_AMOUNT

export const getPlanLabel = (role) =>
  role === 'admin' ? 'Admin Plan' : 'Pro Plan'

export const toJsDate = (value) => {
  if (!value) return null
  if (value.toDate) return value.toDate()
  if (value.seconds != null) return new Date(value.seconds * 1000)
  return new Date(value)
}

export const isSubscriptionActive = (endDate) => {
  const end = toJsDate(endDate)
  if (!end || isNaN(end.getTime())) return false
  return end >= new Date()
}

export const formatSubscriptionStatus = (data) => {
  if (!data?.subscriptionenddate) {
    return data?.hasUsedTrial
      ? 'No active subscription. Subscribe to continue.'
      : `Start your ${TRIAL_MONTHS}-month free trial or subscribe today.`
  }

  const endDate = toJsDate(data.subscriptionenddate)
  const startDate = toJsDate(data.subscriptionstartdate)
  const now = new Date()

  if (!endDate || isNaN(endDate.getTime())) {
    return 'Invalid subscription date. Please subscribe.'
  }

  if (endDate < now) {
    const isTrial =
      startDate &&
      Math.abs(endDate - startDate) <= TRIAL_MONTHS * 30 * 24 * 60 * 60 * 1000
    return `Your ${isTrial ? 'free trial' : 'subscription'} expired on ${endDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}.`
  }

  const isTrial =
    startDate &&
    Math.abs(endDate - startDate) <= TRIAL_MONTHS * 30 * 24 * 60 * 60 * 1000

  if (isTrial) {
    return `Free trial active until ${endDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}.`
  }

  return `Active until ${endDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}.`
}

export const formatMK = (amount) =>
  new Intl.NumberFormat('en-MW', {
    style: 'currency',
    currency: 'MWK',
    minimumFractionDigits: 0,
  }).format(amount)
