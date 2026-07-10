import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

/** Parse basic device info from the browser (client-side only). */
export function getDeviceInfo() {
  const ua = navigator.userAgent || ''
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua)

  let browser = 'Unknown'
  if (/Edg\//i.test(ua)) browser = 'Edge'
  else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome'
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari'
  else if (/Firefox/i.test(ua)) browser = 'Firefox'
  else if (/Opera|OPR/i.test(ua)) browser = 'Opera'

  let platform = 'Unknown'
  if (/Windows/i.test(ua)) platform = 'Windows'
  else if (/Mac OS/i.test(ua)) platform = 'macOS'
  else if (/Android/i.test(ua)) platform = 'Android'
  else if (/iPhone|iPad|iPod/i.test(ua)) platform = 'iOS'
  else if (/Linux/i.test(ua)) platform = 'Linux'

  return {
    userAgent: ua.slice(0, 500),
    browser,
    platform,
    isMobile,
    screen: typeof window !== 'undefined' ? `${window.screen.width}×${window.screen.height}` : null,
  }
}

/**
 * Which admin "owns" this login for audit scoping.
 * - Team members → their managing admin (managedBy / createdBy)
 * - School admins → themselves (so they can see their own sign-ins)
 * - Others → null (super-admin only in platform-wide view)
 */
export function resolveScopeAdminId(userId, userData = {}) {
  if (userData.managedBy) return userData.managedBy
  if (userData.createdBy && userData.role !== 'super-admin') return userData.createdBy
  if (userData.role === 'admin') return userId
  return null
}

/** Record a successful login event (call after auth + profile load). */
export async function recordLoginLog(userId, userData = {}) {
  try {
    await addDoc(collection(db, 'loginLogs'), {
      userId,
      email: userData.email || '',
      fullName: userData.fullName || '',
      role: userData.role || 'student',
      managedBy: userData.managedBy || null,
      createdBy: userData.createdBy || null,
      scopeAdminId: resolveScopeAdminId(userId, userData),
      event: 'login',
      success: true,
      timestamp: serverTimestamp(),
      device: getDeviceInfo(),
    })
  } catch (err) {
    console.warn('Login log not saved:', err.message)
  }
}

export const formatLogTimestamp = (value) => {
  if (!value) return '—'
  const d = value.toDate ? value.toDate() : new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const roleBadgeColor = (role) => {
  const map = {
    admin: 'primary',
    'super-admin': 'danger',
    teacher: 'info',
    student: 'success',
    parent: 'secondary',
  }
  return map[role] || 'light'
}
