import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { touchUserPresence } from '../utils/loginLogs'

/** Keeps lastActiveAt fresh while the user has the app open. */
export function useUserPresence() {
  useEffect(() => {
    let intervalId = null
    let uid = null

    const onVisible = () => {
      if (document.visibilityState === 'visible' && uid) touchUserPresence(uid)
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      if (intervalId) clearInterval(intervalId)
      uid = user?.uid || null

      if (!uid) return

      touchUserPresence(uid)
      intervalId = setInterval(() => touchUserPresence(uid), 120_000)
    })

    document.addEventListener('visibilitychange', onVisible)

    return () => {
      unsub()
      if (intervalId) clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
}

export default useUserPresence
