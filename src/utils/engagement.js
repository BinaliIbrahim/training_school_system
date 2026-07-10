const STORAGE_PREFIX = 'sms-engagement-'
const DAILY_GOAL = 5

const todayKey = () => new Date().toISOString().slice(0, 10)

const yesterdayKey = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

const defaultState = () => ({
  lastActiveDate: null,
  streak: 0,
  actionsToday: 0,
  totalActions: 0,
  bestStreak: 0,
})

export function loadEngagement(uid) {
  if (!uid) return defaultState()
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${uid}`)
    return raw ? { ...defaultState(), ...JSON.parse(raw) } : defaultState()
  } catch {
    return defaultState()
  }
}

function saveEngagement(uid, state) {
  if (!uid) return
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${uid}`, JSON.stringify(state))
  } catch {
    /* ignore quota */
  }
}

/** Call after a successful user action (create, update, payment, etc.) */
export function recordAction(uid) {
  if (!uid) return loadEngagement(uid)

  const state = loadEngagement(uid)
  const today = todayKey()

  if (state.lastActiveDate === today) {
    state.actionsToday += 1
  } else if (state.lastActiveDate === yesterdayKey()) {
    state.streak = (state.streak || 0) + 1
    state.actionsToday = 1
    state.lastActiveDate = today
  } else {
    state.streak = 1
    state.actionsToday = 1
    state.lastActiveDate = today
  }

  state.totalActions = (state.totalActions || 0) + 1
  state.bestStreak = Math.max(state.bestStreak || 0, state.streak)
  saveEngagement(uid, state)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('sms-engagement-update'))
  }
  return state
}

export function getDailyProgress(actionsToday) {
  return Math.min(100, Math.round((actionsToday / DAILY_GOAL) * 100))
}

export function getMotivation({ streak, actionsToday, progress }) {
  if (progress >= 100) return "Daily goal crushed — you're on fire today!"
  if (streak >= 7) return `${streak}-day streak! Consistency builds great schools.`
  if (streak >= 3) return 'Nice momentum — keep your streak alive.'
  if (actionsToday >= 2) return 'Great pace today. One more task?'
  if (actionsToday === 1) return 'First win of the day — keep going!'
  return 'Every action moves your school forward.'
}

export const DAILY_ACTION_GOAL = DAILY_GOAL
