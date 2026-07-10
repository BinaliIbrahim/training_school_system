import { useState, useEffect, useCallback } from 'react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

export const DEFAULT_PREFERENCES = {
  emailNotifications: true,
  pushNotifications: true,
  paymentAlerts: true,
  weeklyDigest: false,
  sidebarCompact: false,
  dateFormat: 'dd/MM/yyyy',
  showWelcomeTips: true,
}

export const useUserPreferences = (uid) => {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!uid) {
      setLoading(false)
      return
    }

    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', uid))
        if (snap.exists() && snap.data().preferences) {
          const prefs = { ...DEFAULT_PREFERENCES, ...snap.data().preferences }
          setPreferences(prefs)
          localStorage.setItem('sms-show-welcome-tips', prefs.showWelcomeTips ? 'true' : 'false')
        }
      } catch (err) {
        console.error('Failed to load preferences', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [uid])

  const savePreference = useCallback(
    async (key, value) => {
      if (!uid) return false
      const next = { ...preferences, [key]: value }
      setPreferences(next)
      setSaving(true)
      try {
        await updateDoc(doc(db, 'users', uid), { preferences: next })
        return true
      } catch (err) {
        console.error('Failed to save preference', err)
        setPreferences(preferences)
        return false
      } finally {
        setSaving(false)
      }
    },
    [uid, preferences],
  )

  const savePreferences = useCallback(
    async (patch) => {
      if (!uid) return false
      const next = { ...preferences, ...patch }
      setPreferences(next)
      setSaving(true)
      try {
        await updateDoc(doc(db, 'users', uid), { preferences: next })
        return true
      } catch (err) {
        console.error('Failed to save preferences', err)
        setPreferences(preferences)
        return false
      } finally {
        setSaving(false)
      }
    },
    [uid, preferences],
  )

  return { preferences, loading, saving, savePreference, savePreferences }
}
